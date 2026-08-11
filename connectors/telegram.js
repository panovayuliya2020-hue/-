// Telegram Bot API — getChatMemberCount. Бот должен быть добавлен в канал
// (администратором) хотя бы для получения численности участников.
async function getChannelStats({ botToken, channelUsername }) {
  if (!botToken || !channelUsername) {
    return { ok: false, platform: 'telegram', channel: channelUsername || null, error: 'missing_config' };
  }

  const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;
  const url = `https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
    if (!data.ok) throw new Error(data.description || `Telegram API error`);
  } catch (err) {
    return { ok: false, platform: 'telegram', channel: chatId, error: err.message };
  }

  return {
    ok: true,
    platform: 'telegram',
    channel: chatId,
    subscribers: Number(data.result),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getChannelStats };
