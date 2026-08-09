// Копим уведомления от Продамус локально (простой append-only JSON-файл —
// для прототипа этого достаточно; на реальную нагрузку потом заменим на БД).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'prodamus-events.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function append(event) {
  const events = readAll();
  events.push(event);
  fs.writeFileSync(FILE, JSON.stringify(events, null, 2));
}

function summary({ dateFrom, dateTo }) {
  if (!fs.existsSync(FILE)) {
    return { ok: false, source: 'prodamus', error: 'no_events_yet' };
  }

  const events = readAll();
  const daily = {};
  let total = 0;
  let salesCount = 0;

  for (const ev of events) {
    if (ev.amount == null || !ev.date) continue;
    if (ev.date < dateFrom || ev.date > dateTo) continue;
    total += ev.amount;
    salesCount += 1;
    daily[ev.date] = (daily[ev.date] || 0) + ev.amount;
  }

  return {
    ok: true,
    source: 'prodamus',
    currency: 'RUB',
    totalThisMonth: total,
    salesCount,
    daily: Object.entries(daily).map(([date, amount]) => ({ date, amount })),
    eventsReceived: events.length,
  };
}

module.exports = { readAll, append, summary };
