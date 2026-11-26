// Pure helpers (no chrome.* APIs) so they can be unit-tested with `node --test`.

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Match patterns for links the "Play link on TV" menu item appears on. */
export const LINK_PATTERNS = [
  '*://*.youtube.com/*',
  '*://youtu.be/*',
  '*://*.youtube-nocookie.com/*',
];

/** Match patterns for pages the "Play this video on TV" menu item appears on. */
export const PAGE_PATTERNS = [
  '*://*.youtube.com/watch*',
  '*://*.youtube.com/shorts/*',
  '*://*.youtube.com/live/*',
];

/**
 * Extracts the 11-character video ID from any common YouTube URL form.
 * Returns null if the URL isn't a single-video YouTube URL.
 */
export function extractVideoId(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;

  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
      if (m) id = m[1];
    }
  }

  return id && VIDEO_ID_RE.test(id) ? id : null;
}
