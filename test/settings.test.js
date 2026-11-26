import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, parsePresets } from '../lib/settings.js';
import { playOnTv } from '../lib/ha.js';

test('default presets parse', () => assert.deepEqual(parsePresets(DEFAULTS.volumePresets), [10, 20, 30]));
test('presets accept % and mixed separators', () => assert.deepEqual(parsePresets('5%; 12.5 30,'), [5, 12.5, 30]));
test('empty presets -> none', () => assert.deepEqual(parsePresets(''), []));
test('rejects out-of-range preset', () => assert.throws(() => parsePresets('10, 150'), /150/));
test('rejects non-numeric preset', () => assert.throws(() => parsePresets('loud'), /loud/));

test('play request uses the configured variable name', async () => {
  const s = { ...DEFAULTS, haUrl: 'http://ha', token: 't', dryRun: true };
  const def = await playOnTv(s, 'dQw4w9WgXcQ');
  assert.deepEqual(def.data, { entity_id: DEFAULTS.scriptEntity, variables: { video_id: 'dQw4w9WgXcQ' } });

  const custom = await playOnTv({ ...s, scriptEntity: 'script.other', videoVariable: 'yt' }, 'dQw4w9WgXcQ');
  assert.deepEqual(custom.data, { entity_id: 'script.other', variables: { yt: 'dQw4w9WgXcQ' } });
});
