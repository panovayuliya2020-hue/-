// MAX (мессенджер VK) — платформа для партнёров, chat-бот API.
// Подтверждено реальным запросом: https://platform-api2.max.ru/chats/{chatId}
// Заголовок авторизации — просто сам токен, без "Bearer" (без query-параметров,
// они больше не поддерживаются). Поле числа подписчиков — participants_count.
async function getChannelStats({ token, chatId }) {
  if (!token || !chatId) {
    return { ok: false, platform: 'max', channel: chatId || null, error: 'missing_config' };
  }

  const url = `https://platform-api2.max.ru/chats/${encodeURIComponent(chatId)}`;

  let data;
  try {
    const res = await fetch(url, { headers: { Authorization: token } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MAX API ${res.status}: ${body.slice(0, 200)}`);
    }
    data = await res.json();
  } catch (err) {
    return { ok: false, platform: 'max', channel: chatId, error: err.message };
  }

  if (data.participants_count == null) {
    return { ok: false, platform: 'max', channel: chatId, error: 'no_participants_count' };
  }

  return {
    ok: true,
    platform: 'max',
    channel: chatId,
    subscribers: Number(data.participants_count),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getChannelStats };
