// Точка Банк: Open Banking API. Подтверждено реальными запросами:
// https://enter.tochka.com/uapi/open-banking/v1.0/...
//  1) POST /statements  { Data: { Statement: { accountId, startDateTime, endDateTime } } }
//     даты должны быть на полночь UTC (без времени суток), формат YYYY-MM-DDT00:00:00Z
//  2) GET  /accounts/{accountId}/statements/{statementId} — пока status !== "Ready", повторять
//  3) Data.Statement[0].Transaction[] — creditDebitIndicator "Credit"/"Debit", Amount.amount,
//     documentProcessDate, status "Booked"
const BASE = 'https://enter.tochka.com/uapi/open-banking/v1.0';
const CACHE_TTL_MS = 5 * 60 * 1000; // выписка генерируется не мгновенно — не дёргаем банк на каждый запрос дашборда

let cache = null; // { key, value, expiresAt }
let refreshing = null;

async function initStatement(token, accountId, dateFrom, dateTo) {
  const res = await fetch(`${BASE}/statements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Data: {
        Statement: {
          accountId,
          startDateTime: `${dateFrom}T00:00:00Z`,
          endDateTime: `${dateTo}T00:00:00Z`,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Tochka init-statement ${res.status}`);
  const data = await res.json();
  return data.Data.Statement.statementId;
}

async function getStatement(token, accountId, statementId) {
  const url = `${BASE}/accounts/${encodeURIComponent(accountId)}/statements/${statementId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Tochka get-statement ${res.status}`);
  return res.json();
}

async function fetchSummary(token, accountId, dateFrom, dateTo) {
  const statementId = await initStatement(token, accountId, dateFrom, dateTo);

  let statement = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    statement = await getStatement(token, accountId, statementId);
    if (statement.Data.Statement[0]?.status === 'Ready') break;
  }

  const txns = statement?.Data.Statement[0]?.Transaction || [];
  const daily = {};
  let total = 0;
  for (const tx of txns) {
    if (tx.creditDebitIndicator !== 'Credit') continue; // только поступления
    if (tx.status !== 'Booked') continue;
    const amount = Number(tx.Amount?.amount || 0);
    const date = tx.documentProcessDate;
    if (!date) continue;
    total += amount;
    daily[date] = (daily[date] || 0) + amount;
  }

  return {
    ok: true,
    source: 'tochka',
    currency: 'RUB',
    totalThisMonth: total,
    daily: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
  };
}

// Отдаёт кэш немедленно (если он есть), в фоне обновляет, когда истёк —
// иначе дашборд будет ждать генерации выписки на каждой загрузке.
function getMonthSummary({ dateFrom, dateTo }) {
  const token = process.env.TOCHKA_ACCESS_TOKEN;
  const accountId = process.env.TOCHKA_ACCOUNT_ID;
  if (!token || !accountId) {
    return Promise.resolve({ ok: false, source: 'tochka', error: 'missing_config' });
  }

  const key = `${accountId}:${dateFrom}:${dateTo}`;
  const now = Date.now();

  if (cache && cache.key === key && cache.expiresAt > now) {
    return Promise.resolve(cache.value);
  }

  if (!refreshing) {
    refreshing = fetchSummary(token, accountId, dateFrom, dateTo)
      .then((value) => {
        cache = { key, value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
      })
      .catch((err) => ({ ok: false, source: 'tochka', error: err.message }))
      .finally(() => {
        refreshing = null;
      });
  }

  // Если старый кэш ещё есть (пусть и просрочен) — отдаём его сразу, обновление идёт в фоне.
  if (cache && cache.key === key) {
    return Promise.resolve(cache.value);
  }

  return refreshing;
}

module.exports = { getMonthSummary };
