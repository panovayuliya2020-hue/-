const { getTransactionsSummary } = require('./bank-generic');

// Точка Банк: OAuth-токен и путь выписки берутся из личного кабинета
// разработчика (после регистрации приложения). См. server/.env.example.
function getMonthSummary(range) {
  return getTransactionsSummary({
    source: 'tochka',
    baseUrl: process.env.TOCHKA_BASE_URL,
    path: process.env.TOCHKA_TRANSACTIONS_PATH,
    token: process.env.TOCHKA_ACCESS_TOKEN,
    ...range,
  });
}

module.exports = { getMonthSummary };
