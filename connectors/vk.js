// VK API — стабильный публичный метод groups.getById с полем members_count.
async function getGroupStats({ token, groupId }) {
  if (!token || !groupId) {
    return { ok: false, platform: 'vk', channel: groupId || null, error: 'missing_config' };
  }

  const url = new URL('https://api.vk.com/method/groups.getById');
  url.searchParams.set('group_id', groupId);
  url.searchParams.set('fields', 'members_count');
  url.searchParams.set('access_token', token);
  url.searchParams.set('v', '5.199');

  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`VK API ${res.status}`);
    data = await res.json();
  } catch (err) {
    return { ok: false, platform: 'vk', channel: groupId, error: err.message };
  }

  if (data.error) {
    return { ok: false, platform: 'vk', channel: groupId, error: data.error.error_msg || 'vk_api_error' };
  }

  const group = data.response && data.response.groups && data.response.groups[0];
  if (!group) {
    return { ok: false, platform: 'vk', channel: groupId, error: 'group_not_found' };
  }

  return {
    ok: true,
    platform: 'vk',
    channel: groupId,
    subscribers: Number(group.members_count),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { getGroupStats };
