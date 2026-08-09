const { getTransactionsSummary } = require('./bank-generic');

// Тинькофф Бизнес API: токен выпускается в личном кабинете для конкретного
// счёта. См. server/.env.example.
function getMonthSummary(range) {
  return getTransactionsSummary({
    source: 'tinkoff',
    baseUrl: process.env.TINKOFF_BASE_URL,
    path: process.env.TINKOFF_TRANSACTIONS_PATH,
    token: process.env.TINKOFF_ACCESS_TOKEN,
    ...range,
  });
}

module.exports = { getMonthSummary };
