// Telegram Bot API — getChatMemberCount. Бот должен быть добавлен в канал
// (администратором) хотя бы для получения численности участников.
// Соединения до api.telegram.org с этого сервера иногда подвисают
// (наблюдалось ~1 из 3 попыток) — короткий таймаут + повтор, чтобы не
// растягивать /api/overview на весь дашборд из-за одного канала.
async function fetchOnce(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getChannelStats({ botToken, channelUsername }) {
  if (!botToken || !channelUsername) {
    return { ok: false, platform: 'telegram', channel: channelUsername || null, error: 'missing_config' };
  }

  const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
  const url = `https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await fetchOnce(url, 4000);
      if (!data.ok) throw new Error(data.description || 'Telegram API error');
      return {
        ok: true,
        platform: 'telegram',
        channel: chatId,
        subscribers: Number(data.result),
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      lastErr = err;
    }
  }

  return { ok: false, platform: 'telegram', channel: chatId, error: lastErr.message };
}

module.exports = { getChannelStats };
