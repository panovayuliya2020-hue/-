// Общая логика для банковских REST API (Точка / Тинькофф / Сбербанк):
// Bearer-токен + список операций за период. Конкретные base URL и путь
// эндпоинта НЕ прописаны здесь — их нет ни в одном из трёх банковских
// коннекторов, чтобы не выдавать угаданный путь за настоящий. Заполняются
// через .env, когда точный эндпоинт подтверждён по документации банка.
async function getTransactionsSummary({ source, baseUrl, path, token, dateFrom, dateTo }) {
  if (!baseUrl || !path || !token) {
    return { ok: false, source, error: 'missing_config' };
  }

  const url = new URL(path, baseUrl);
  url.searchParams.set('dateFrom', dateFrom);
  url.searchParams.set('dateTo', dateTo);

  let data;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${source} API ${res.status}`);
    data = await res.json();
  } catch (err) {
    return { ok: false, source, error: err.message };
  }

  const list = Array.isArray(data.transactions)
    ? data.transactions
    : Array.isArray(data.operations)
    ? data.operations
    : Array.isArray(data)
    ? data
    : [];

  const daily = {};
  let total = 0;
  for (const tx of list) {
    const amount = Number(tx.amount ?? tx.sum ?? 0);
    if (amount <= 0) continue; // только поступления — для плитки "Деньги"
    const date = String(tx.date ?? tx.createdAt ?? tx.operationDate ?? '').slice(0, 10);
    if (!date) continue;
    total += amount;
    daily[date] = (daily[date] || 0) + amount;
  }

  return {
    ok: true,
    source,
    currency: 'RUB',
    totalThisMonth: total,
    daily: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
  };
}

module.exports = { getTransactionsSummary };
