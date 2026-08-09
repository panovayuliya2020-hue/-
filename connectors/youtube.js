// YouTube Data API v3 — стабильный публичный API.
// Канал можно указать двумя способами: точным channelId (UC...) или
// хэндлом (@имя, как в адресной строке канала) через параметр forHandle.
async function getChannelStats({ apiKey, channelId, handle }) {
  const label = channelId || handle;
  if (!apiKey || !label) {
    return { ok: false, platform: 'youtube', channel: label || null, error: 'missing_config' };
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'statistics');
  if (channelId) {
    url.searchParams.set('id', channelId);
  } else {
    var cleanHandle = handle.startsWith('@') ? handle : '@' + handle;
    url.searchParams.set('forHandle', cleanHandle);
  }
  url.searchParams.set('key', apiKey);

  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    data = await res.json();
  } catch (err) {
    return { ok: false, platform: 'youtube', channel: label, error: err.message };
  }

  const item = data.items && data.items[0];
  if (!item) {
    return { ok: false, platform: 'youtube', channel: label, error: 'channel_not_found' };
  }

  return {
    ok: true,
    platform: 'youtube',
    channel: label,
    subscribers: Number(item.statistics.subscriberCount),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getChannelStats };
