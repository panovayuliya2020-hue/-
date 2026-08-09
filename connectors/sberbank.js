const { getTransactionsSummary } = require('./bank-generic');

// Сбербанк: у Сбера несколько разных API-продуктов (Sber Business API,
// эквайринг и др.) — уточните, какой именно вы подключаете, прежде чем
// заполнять .env, так как от этого зависят base URL и путь.
function getMonthSummary(range) {
  return getTransactionsSummary({
    source: 'sberbank',
    baseUrl: process.env.SBERBANK_BASE_URL,
    path: process.env.SBERBANK_TRANSACTIONS_PATH,
    token: process.env.SBERBANK_ACCESS_TOKEN,
    ...range,
  });
}

module.exports = { getMonthSummary };
