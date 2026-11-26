import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractVideoId } from '../lib/youtube.js';

const ID = 'dQw4w9WgXcQ';

const valid = [
  `https://www.youtube.com/watch?v=${ID}`,
  `https://youtube.com/watch?v=${ID}&t=42s`,
  `https://www.youtube.com/watch?list=PL123&v=${ID}&index=3`,
  `https://m.youtube.com/watch?v=${ID}`,
  `https://music.youtube.com/watch?v=${ID}`,
  `https://youtu.be/${ID}`,
  `https://youtu.be/${ID}?si=abc&t=10`,
  `https://www.youtube.com/shorts/${ID}`,
  `https://www.youtube.com/embed/${ID}?autoplay=1`,
  `https://www.youtube.com/live/${ID}?feature=share`,
  `https://www.youtube-nocookie.com/embed/${ID}`,
  `http://www.youtube.com/v/${ID}`,
];

const invalid = [
  undefined,
  '',
  'not a url',
  'https://www.youtube.com/',
  'https://www.youtube.com/@somechannel',
  'https://www.youtube.com/playlist?list=PL123',
  'https://www.youtube.com/watch?v=tooShort',
  'https://www.youtube.com/watch?v=waytoolongvideoid',
  `https://example.com/watch?v=${ID}`,
  `https://notyoutube.com/watch?v=${ID}`,
];

for (const url of valid) {
  test(`extracts id from ${url}`, () => assert.equal(extractVideoId(url), ID));
}

for (const url of invalid) {
  test(`rejects ${JSON.stringify(url)}`, () => assert.equal(extractVideoId(url), null));
}
