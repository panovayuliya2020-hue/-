// RuTube — публичное API без токена. Подтверждено реальным запросом:
// https://rutube.ru/api/profile/user/{channelId}/ -> subscribers_count
// Нужен обычный браузерный User-Agent, иначе может вернуть 403.
async function getChannelStats({ channelId }) {
  if (!channelId) {
    return { ok: false, platform: 'rutube', channel: null, error: 'missing_config' };
  }

  const url = `https://rutube.ru/api/profile/user/${encodeURIComponent(channelId)}/`;

  let data;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`RuTube API ${res.status}`);
    data = await res.json();
  } catch (err) {
    return { ok: false, platform: 'rutube', channel: channelId, error: err.message };
  }

  if (data.subscribers_count == null) {
    return { ok: false, platform: 'rutube', channel: channelId, error: 'no_subscribers_count' };
  }

  return {
    ok: true,
    platform: 'rutube',
    channel: channelId,
    subscribers: Number(data.subscribers_count),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getChannelStats };
