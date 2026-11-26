// Everything except the connection fields can be reset to these defaults.
export const DEFAULTS = {
  haUrl: '',
  token: '',
  // Playing a video
  scriptEntity: 'script.tv_play_youtube_video',
  videoVariable: 'video_id',
  // TV + popup controls
  tvEntity: 'media_player.living_room_vidaa_smart_tv',
  onScript: 'script.tv_on',
  offScript: 'script.tv_turn_off',
  volumePresets: '10, 14, 20',
  dryRun: false,
};

export const CONNECTION_KEYS = ['haUrl', 'token'];

export async function getSettings() {
  return chrome.storage.local.get(DEFAULTS);
}

export function isConfigured(s) {
  return Boolean(s.haUrl && s.token && s.scriptEntity);
}

/** "10, 14 20" -> [10, 14, 20] (percent). Throws on anything that isn't 0-100. */
export function parsePresets(str) {
  const parts = String(str ?? '').split(/[\s,;]+/).filter(Boolean);
  return parts.map((p) => {
    const n = Number(p.replace(/%$/, ''));
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`Volume preset "${p}" must be 0-100`);
    return n;
  });
}

/** Host permission pattern for the HA URL (ports are matched implicitly). */
export function originPattern(haUrl) {
  const u = new URL(haUrl);
  return `${u.protocol}//${u.hostname}/*`;
}

export async function hasHostPermission(haUrl) {
  return chrome.permissions.contains({ origins: [originPattern(haUrl)] });
}

/** Returns null when ready, otherwise a short reason why the extension can't call HA yet. */
export async function notReadyReason(s) {
  if (!isConfigured(s)) return 'Set your Home Assistant URL and token first.';
  if (!(await hasHostPermission(s.haUrl))) return 'Click Save in the settings to grant access to Home Assistant.';
  return null;
}
