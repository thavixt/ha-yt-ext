import { getSettings, notReadyReason, parsePresets } from './lib/settings.js';
import { callService, getState, playOnTv, runScript } from './lib/ha.js';
import { extractVideoId } from './lib/youtube.js';

const $ = (id) => document.getElementById(id);
const POLL_MS = 3000;

let settings;
let tv = null; // last fetched state object

function setStatus(text, kind = '') {
  $('status').textContent = text;
  $('status').className = kind;
}

const isOn = () => tv && !['off', 'unavailable', 'unknown', 'standby'].includes(tv.state);

function render() {
  const on = isOn();
  const a = tv?.attributes ?? {};

  $('tvName').textContent = a.friendly_name ?? settings.tvEntity;
  $('statePill').textContent = tv?.state ?? '?';
  $('statePill').className = `pill ${on ? 'on' : ''}`;
  $('source').textContent = on ? [a.app_name, a.source].filter(Boolean)[0] ?? '' : '';

  for (const el of document.querySelectorAll('.tv-on')) el.disabled = !on;

  const muted = Boolean(a.is_volume_muted);
  $('mute').classList.toggle('active', muted);
  $('mute').title = muted ? 'Unmute' : 'Mute';
  $('muteIcon').querySelector('.wave').style.display = muted ? 'none' : '';
  $('muteIcon').querySelector('.x').style.display = muted ? '' : 'none';

  $('power').className = `power ${on ? 'off' : ''}`;
  $('powerLabel').textContent = on ? 'Turn TV off' : 'Turn TV on';
}

async function refresh() {
  try {
    tv = await getState(settings, settings.tvEntity);
    render();
  } catch (e) {
    setStatus(e.message, 'err');
  }
}

/** Runs an HA call with button feedback, then refreshes state shortly after. */
async function act(button, label, fn) {
  button.disabled = true;
  setStatus(`${label}…`);
  try {
    await fn();
    setStatus(settings.dryRun ? `${label} (dry run, see console)` : label, 'ok');
    setTimeout(refresh, 800);
  } catch (e) {
    setStatus(e.message, 'err');
  } finally {
    button.disabled = false;
    render();
  }
}

const tvTarget = () => ({ entity_id: settings.tvEntity });

function wire(tabVideoId) {
  $('volUp').onclick = (e) =>
    act(e.currentTarget, 'Volume up', () => callService(settings, 'media_player', 'volume_up', tvTarget()));
  $('volDown').onclick = (e) =>
    act(e.currentTarget, 'Volume down', () => callService(settings, 'media_player', 'volume_down', tvTarget()));
  $('mute').onclick = (e) => {
    const mute = !tv?.attributes?.is_volume_muted;
    act(e.currentTarget, mute ? 'Muted' : 'Unmuted', () =>
      callService(settings, 'media_player', 'volume_mute', { ...tvTarget(), is_volume_muted: mute }),
    );
  };
  let presets = [];
  try {
    presets = parsePresets(settings.volumePresets);
  } catch (e) {
    setStatus(e.message, 'err');
  }
  $('presets').hidden = presets.length === 0;
  for (const pct of presets) {
    const b = document.createElement('button');
    b.className = 'tv-on';
    b.textContent = `${pct}%`;
    b.onclick = () =>
      act(b, `Volume ${pct}%`, () =>
        callService(settings, 'media_player', 'volume_set', { ...tvTarget(), volume_level: pct / 100 }),
      );
    $('presets').append(b);
  }

  $('power').onclick = (e) => {
    if (isOn()) {
      act(e.currentTarget, 'Turning off', () =>
        settings.offScript
          ? runScript(settings, settings.offScript)
          : callService(settings, 'media_player', 'turn_off', tvTarget()),
      );
    } else {
      act(e.currentTarget, 'Turning on', () =>
        settings.onScript
          ? runScript(settings, settings.onScript)
          : callService(settings, 'media_player', 'turn_on', tvTarget()),
      );
    }
  };

  if (tabVideoId) {
    $('play').onclick = (e) => act(e.currentTarget, 'Sent to TV', () => playOnTv(settings, tabVideoId));
  }
}

$('settings').onclick = (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

async function init() {
  settings = await getSettings();
  $('dryPill').hidden = !settings.dryRun;

  const reason = await notReadyReason(settings);
  if (reason) {
    for (const b of document.querySelectorAll('button')) b.disabled = true;
    $('statePill').textContent = 'setup';
    return setStatus(reason, 'err');
  }

  // Opening the popup grants activeTab, so the current tab's URL is readable.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const videoId = extractVideoId(tab?.url);
  if (videoId) {
    $('playSection').hidden = false;
    $('tabTitle').textContent = tab.title?.replace(/ - YouTube$/, '') || videoId;
    $('tabTitle').title = tab.title ?? '';
  }

  wire(videoId);
  await refresh();
  setInterval(refresh, POLL_MS);
}

init();
