// Home Assistant REST calls. No chrome.* APIs, so this also runs in Node (scripts/send.mjs).

export class HaError extends Error {}

const TIMEOUT_MS = 10_000;

function baseUrl(settings) {
  return settings.haUrl.replace(/\/+$/, '');
}

async function haFetch(settings, path, init = {}) {
  const base = baseUrl(settings);
  let res;
  try {
    res = await fetch(base + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    if (e.name === 'TimeoutError') throw new HaError(`Timed out reaching ${base}`);
    throw new HaError(`Can't reach ${base} (${e.message})`);
  }

  if (res.status === 401) throw new HaError('Unauthorized: check the access token');
  if (res.status === 404) throw new HaError(`Not found: ${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HaError(`Home Assistant returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return res.json().catch(() => null);
}

/** Calls any HA action. Honors dry run (logs instead of sending). */
export async function callService(settings, domain, service, data = {}) {
  const path = `/api/services/${domain}/${service}`;
  if (settings.dryRun) {
    console.log('[dry run] POST', baseUrl(settings) + path, data);
    return { dryRun: true, path, data };
  }
  return haFetch(settings, path, { method: 'POST', body: JSON.stringify(data) });
}

export async function getState(settings, entityId) {
  return haFetch(settings, `/api/states/${encodeURIComponent(entityId)}`);
}

/**
 * Starts a script without waiting for it to finish. Calling script.<name>
 * directly blocks until done (power on, app launch, volume fade take ~15s+).
 */
export function runScript(settings, entityId, variables = {}) {
  return callService(settings, 'script', 'turn_on', { entity_id: entityId, variables });
}

export function playOnTv(settings, videoId) {
  return runScript(settings, settings.scriptEntity, { [settings.videoVariable || 'video_id']: videoId });
}

/** Verifies URL + token and that every configured entity exists. Returns their friendly names. */
export async function testConnection(settings) {
  await haFetch(settings, '/api/');
  const entities = [settings.scriptEntity, settings.tvEntity, settings.onScript, settings.offScript].filter(Boolean);
  const names = [];
  for (const id of entities) {
    try {
      const state = await getState(settings, id);
      names.push(state?.attributes?.friendly_name ?? id);
    } catch (e) {
      if (e.message.startsWith('Not found')) throw new HaError(`Connected, but ${id} doesn't exist`);
      throw e;
    }
  }
  return names;
}
