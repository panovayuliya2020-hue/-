require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const youtube = require('./connectors/youtube');
const vk = require('./connectors/vk');
const instagram = require('./connectors/instagram');
const tochka = require('./connectors/tochka');
const tinkoff = require('./connectors/tinkoff');
const sberbank = require('./connectors/sberbank');
const prodamusStore = require('./store/prodamus-store');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8787;

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: toLocalDateStr(from),
    dateTo: toLocalDateStr(now),
  };
}

function mergeDaily(sourceResults) {
  const daily = {};
  for (const r of sourceResults) {
    if (!r.ok || !Array.isArray(r.daily)) continue;
    for (const { date, amount } of r.daily) {
      daily[date] = (daily[date] || 0) + amount;
    }
  }
  return Object.entries(daily)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount }));
}

// Продамус шлёт вебхук на каждую оплату — здесь его принимаем и копим сырые
// данные локально. Подпись приходит в заголовке Sign, но точный алгоритм её
// расчёта не задокументирован публично и подбором не нашёлся (проверено
// несколько вариантов на реальном событии) — поэтому не блокируем приём по
// ней, только помечаем как "не проверено".
function verifyProdamusSignature(signatureHeader) {
  return signatureHeader ? 'not_verified' : 'missing';
}

function extractSaleFields(parsed) {
  if (!parsed) return { amount: null, date: null, status: null, isTest: false };
  const amount = parsed.sum ?? parsed.amount ?? parsed.order_sum ?? parsed.payment_amount;
  const rawDate = parsed.date ?? parsed.payment_date ?? parsed.order_date ?? parsed.created_at;
  const status = parsed.payment_status ?? parsed.status ?? parsed.order_status ?? null;
  return {
    amount: amount != null && amount !== '' ? Number(amount) : null,
    date: rawDate ? String(rawDate).slice(0, 10) : null,
    status,
    isTest: parsed.sys === 'test',
  };
}

app.post('/webhooks/prodamus', express.raw({ type: () => true, limit: '1mb' }), (req, res) => {
  const raw = req.body.toString('utf8');
  const contentType = req.headers['content-type'] || '';

  let parsed = null;
  try {
    parsed = contentType.includes('application/json')
      ? JSON.parse(raw)
      : Object.fromEntries(new URLSearchParams(raw));
  } catch (err) {
    parsed = null;
  }

  const signatureStatus = verifyProdamusSignature(req.headers['sign']);
  const { amount, date, status, isTest } = extractSaleFields(parsed);

  prodamusStore.append({
    receivedAt: new Date().toISOString(),
    contentType,
    signatureStatus,
    amount,
    date,
    status,
    isTest,
    parsed,
    raw,
  });

  console.log('[prodamus webhook]', contentType, 'signature:', signatureStatus, 'amount:', amount, 'date:', date);

  res.status(200).send('OK');
});

app.get('/webhooks/prodamus/debug', (req, res) => {
  const events = prodamusStore.readAll();
  res.json({ count: events.length, events: events.slice(-10) });
});

app.get('/api/overview', async (req, res) => {
  const range = monthRange();

  const [prodamusRes, tochkaRes, tinkoffRes, sberbankRes, youtubeRes, vkRes, instagramRes] = await Promise.all([
    Promise.resolve(prodamusStore.summary(range)),
    tochka.getMonthSummary(range),
    tinkoff.getMonthSummary(range),
    sberbank.getMonthSummary(range),
    youtube.getChannelStats({
      apiKey: process.env.YOUTUBE_API_KEY,
      channelId: process.env.YOUTUBE_CHANNEL_ID,
      handle: process.env.YOUTUBE_CHANNEL_HANDLE,
    }),
    vk.getGroupStats({
      token: process.env.VK_ACCESS_TOKEN,
      groupId: process.env.VK_GROUP_ID,
    }),
    instagram.getAccountStats({
      token: process.env.INSTAGRAM_ACCESS_TOKEN,
      igUserId: process.env.INSTAGRAM_USER_ID,
    }),
  ]);

  const moneySources = [prodamusRes, tochkaRes, tinkoffRes, sberbankRes];
  const totalThisMonth = moneySources.reduce((sum, r) => sum + (r.ok ? r.totalThisMonth : 0), 0);

  const channels = [youtubeRes, vkRes, instagramRes];
  const totalSubscribers = channels.reduce((sum, c) => sum + (c.ok ? c.subscribers : 0), 0);

  res.json({
    generatedAt: new Date().toISOString(),
    range,
    money: {
      totalThisMonth,
      currency: 'RUB',
      daily: mergeDaily(moneySources),
      bySource: moneySources,
    },
    sales: {
      count: prodamusRes.ok ? prodamusRes.salesCount : null,
      bySource: [prodamusRes],
    },
    subscribers: {
      total: totalSubscribers,
      byChannel: channels,
    },
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Dashboard API listening on http://localhost:${PORT}`);
});
