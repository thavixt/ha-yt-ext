import { DEFAULTS, CONNECTION_KEYS, getSettings, originPattern, parsePresets } from './lib/settings.js';
import { testConnection } from './lib/ha.js';

const $ = (id) => document.getElementById(id);
const form = $('form');

const TEXT_FIELDS = Object.keys(DEFAULTS).filter((k) => typeof DEFAULTS[k] === 'string');
// Fields where "-" means "none" (stored as an empty string).
const OPTIONAL = ['onScript', 'offScript', 'volumePresets'];
const NONE = '-';

const SCRIPT_RE = /^script\.[a-z0-9_]+$/;
const LABELS = {
  scriptEntity: 'Play script',
  videoVariable: 'Video ID variable name',
  tvEntity: 'TV media player',
  onScript: 'Turn-on script',
  offScript: 'Turn-off script',
};

function setStatus(text, kind = '') {
  $('status').textContent = text;
  $('status').className = kind;
}

function readForm() {
  const s = {};
  for (const k of TEXT_FIELDS) {
    const v = $(k).value.trim();
    if (OPTIONAL.includes(k) && v === NONE) s[k] = '';
    else s[k] = v || DEFAULTS[k];
  }
  s.haUrl = s.haUrl.replace(/\/+$/, '');
  s.dryRun = $('dryRun').checked;
  return s;
}

function fillForm(s) {
  for (const k of TEXT_FIELDS) {
    $(k).value = OPTIONAL.includes(k) && s[k] === '' ? NONE : s[k];
  }
  $('dryRun').checked = s.dryRun;
}

function validate(s) {
  let u;
  try {
    u = new URL(s.haUrl);
  } catch {
    throw new Error('Enter a valid URL, e.g. http://homeassistant.local:8123');
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('URL must start with http:// or https://');
  if (!s.token) throw new Error('Token is required');

  const check = (k, re, example) => {
    if (s[k] && !re.test(s[k])) throw new Error(`${LABELS[k]} should look like ${example}`);
  };
  check('scriptEntity', SCRIPT_RE, 'script.something');
  check('onScript', SCRIPT_RE, 'script.something');
  check('offScript', SCRIPT_RE, 'script.something');
  check('tvEntity', /^media_player\.[a-z0-9_]+$/, 'media_player.something');
  check('videoVariable', /^[a-z_][a-z0-9_]*$/i, 'video_id (letters, digits, underscores)');
  parsePresets(s.volumePresets); // throws with a readable message
}

// Must be called synchronously from the click handler (needs the user gesture).
function requestAccess(haUrl) {
  return chrome.permissions.request({ origins: [originPattern(haUrl)] });
}

async function withAccess(handler) {
  const s = readForm();
  try {
    validate(s);
  } catch (e) {
    return setStatus(e.message, 'err');
  }
  const granted = await requestAccess(s.haUrl);
  if (!granted) return setStatus(`Access to ${new URL(s.haUrl).hostname} was denied.`, 'err');
  try {
    await handler(s);
  } catch (e) {
    setStatus(e.message, 'err');
  }
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  withAccess(async (s) => {
    await chrome.storage.local.set(s);
    fillForm(s); // show the defaults that empty fields resolved to
    setStatus(s.dryRun ? 'Saved (dry run is on).' : 'Saved.', 'ok');
  });
});

$('test').addEventListener('click', () => {
  withAccess(async (s) => {
    setStatus('Testing…');
    const names = await testConnection(s);
    setStatus(`Connected. Found ${names.map((n) => `"${n}"`).join(', ')}.`, 'ok');
  });
});

$('reset').addEventListener('click', () => {
  const current = readForm();
  const reset = { ...DEFAULTS };
  for (const k of CONNECTION_KEYS) reset[k] = current[k];
  fillForm(reset);
  setStatus('Defaults restored (URL and token kept). Click Save to apply.');
});

for (const k of TEXT_FIELDS) {
  if (!CONNECTION_KEYS.includes(k)) $(k).placeholder = DEFAULTS[k];
}
fillForm(await getSettings());
