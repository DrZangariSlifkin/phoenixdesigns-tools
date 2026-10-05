const STATE_KEY = 'activity-picker-state';
const DEFAULT_ACTIVITIES = [
  { id: 'ps5', name: 'Play PS5' },
  { id: 'read', name: 'Read' },
  { id: 'paint', name: 'Paint' },
  { id: 'computer', name: 'Computer stuff' }
];

function defaultState() {
  return {
    activities: DEFAULT_ACTIVITIES,
    remainingIds: DEFAULT_ACTIVITIES.map((activity) => activity.id),
    currentId: null,
    lastPickedId: null
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function validateState(value) {
  if (!value || !Array.isArray(value.activities) || !Array.isArray(value.remainingIds)) return null;
  if (value.activities.length > 100) return null;

  const activities = [];
  const ids = new Set();
  for (const item of value.activities) {
    if (typeof item?.id !== 'string' || typeof item?.name !== 'string') return null;
    const id = item.id.trim();
    const name = item.name.trim();
    if (!id || id.length > 100 || !name || name.length > 80 || ids.has(id)) return null;
    ids.add(id);
    activities.push({ id, name });
  }

  const remainingIds = value.remainingIds.filter((id, index, all) =>
    typeof id === 'string' && ids.has(id) && all.indexOf(id) === index
  );
  const currentId = ids.has(value.currentId) ? value.currentId : null;
  const lastPickedId = ids.has(value.lastPickedId) ? value.lastPickedId : null;
  return { activities, remainingIds, currentId, lastPickedId };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/activity-picker') return new Response('Not found', { status: 404 });

    if (request.method === 'GET') {
      const state = await env.ACTIVITY_PICKER.get(STATE_KEY, 'json');
      return json(validateState(state) || defaultState());
    }

    if (request.method === 'PUT') {
      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (contentLength > 50_000) return json({ error: 'Request is too large.' }, 413);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Request body must be JSON.' }, 400);
      }
      const state = validateState(body);
      if (!state) return json({ error: 'Activity data is invalid.' }, 400);
      await env.ACTIVITY_PICKER.put(STATE_KEY, JSON.stringify(state));
      return json(state);
    }

    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, PUT' } });
  }
};

export { defaultState, validateState };
