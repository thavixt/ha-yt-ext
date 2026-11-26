// Sends a YouTube URL to HA exactly like the extension does, using .env, without a browser.
//   node scripts/send.mjs <youtube-url> [--dry]
//   node scripts/send.mjs --test
import { readFileSync } from 'node:fs';
import { extractVideoId } from '../lib/youtube.js';
import { playOnTv, testConnection } from '../lib/ha.js';
import { DEFAULTS } from '../lib/settings.js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const args = process.argv.slice(2);
// Same defaults as the extension; any setting can be overridden in .env as HA_<NAME>,
// e.g. HA_SCRIPTENTITY=script.other or HA_VIDEOVARIABLE=id.
const settings = { ...DEFAULTS };
for (const k of Object.keys(DEFAULTS)) {
  const v = env[`HA_${k.toUpperCase()}`];
  if (v !== undefined) settings[k] = v;
}
settings.haUrl = env.HOME_ASSISTANT_URL;
settings.token = env.HOME_ASSISTANT_ACCESS_TOKEN;
settings.dryRun = args.includes('--dry');

try {
  if (args.includes('--test')) {
    console.log('Connected. Found:', (await testConnection(settings)).join(', '));
  } else {
    const url = args.find((a) => !a.startsWith('--'));
    const id = extractVideoId(url);
    if (!id) throw new Error(`No video ID in ${url}`);
    const result = await playOnTv(settings, id);
    console.log(settings.dryRun ? 'Dry run, nothing sent.' : `Sent ${id}.`, settings.dryRun ? '' : JSON.stringify(result));
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
