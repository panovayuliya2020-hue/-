// Т-Банк (бывший Тинькофф) Business API.
// Хост и путь подтверждены реальным запросом (структурированная ошибка
// UNAUTHORIZED вместо 404) — https://developer.tbank.ru/docs/api/get-api-v-1-bank-statement
// Токен пока недействителен ("Токен недействителен") — ждём рабочий от поддержки.
const BASE = 'https://business.tbank.ru/openapi/api/v1';

async function getMonthSummary({ dateFrom, dateTo }) {
  const token = process.env.TINKOFF_ACCESS_TOKEN;
  const accountNumber = process.env.TINKOFF_ACCOUNT_NUMBER;
  if (!token || !accountNumber) {
    return { ok: false, source: 'tinkoff', error: 'missing_config' };
  }

  const url = new URL(`${BASE}/bank-statement`);
  url.searchParams.set('accountNumber', accountNumber);
  url.searchParams.set('from', dateFrom);
  url.searchParams.set('till', dateTo);

  let data;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Tinkoff API ${res.status}: ${body.slice(0, 200)}`);
    }
    data = await res.json();
  } catch (err) {
    return { ok: false, source: 'tinkoff', error: err.message };
  }

  // Операции ожидаются в data.operations (по документации) — если реальный
  // ответ окажется устроен иначе, поправим по первому успешному вызову.
  const operations = Array.isArray(data.operations) ? data.operations : Array.isArray(data) ? data : [];
  const daily = {};
  let total = 0;
  for (const op of operations) {
    const amount = Number(op.amount ?? op.debetAmount ?? op.creditAmount ?? 0);
    const isCredit = op.type === 'credit' || op.operationType === 'Credit' || amount > 0;
    if (!isCredit) continue;
    const date = String(op.date ?? op.operationDate ?? '').slice(0, 10);
    if (!date) continue;
    total += Math.abs(amount);
    daily[date] = (daily[date] || 0) + Math.abs(amount);
  }

  return {
    ok: true,
    source: 'tinkoff',
    currency: 'RUB',
    totalThisMonth: total,
    daily: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
  };
}

module.exports = { getMonthSummary };
