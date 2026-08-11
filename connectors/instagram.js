// Instagram Graph API — требует бизнес/авторский аккаунт, привязанный к
// странице Facebook, и токен, полученный через Meta for Developers
// (Graph API Explorer: permissions instagram_basic, pages_show_list,
// pages_read_engagement). См. server/README.md.
async function getAccountStats({ token, igUserId }) {
  if (!token || !igUserId) {
    return { ok: false, platform: 'instagram', channel: igUserId || null, error: 'missing_config' };
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${igUserId}`);
  url.searchParams.set('fields', 'followers_count');
  url.searchParams.set('access_token', token);

  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Instagram API ${res.status}: ${body.slice(0, 200)}`);
    }
    data = await res.json();
  } catch (err) {
    return { ok: false, platform: 'instagram', channel: igUserId, error: err.message };
  }

  if (data.followers_count == null) {
    return { ok: false, platform: 'instagram', channel: igUserId, error: 'no_followers_count' };
  }

  return {
    ok: true,
    platform: 'instagram',
    channel: igUserId,
    subscribers: Number(data.followers_count),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getAccountStats };
