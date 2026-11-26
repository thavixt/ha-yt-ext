import { extractVideoId, LINK_PATTERNS, PAGE_PATTERNS } from './lib/youtube.js';
import { getSettings, notReadyReason } from './lib/settings.js';
import { playOnTv } from './lib/ha.js';

const MENU_LINK = 'play-link-on-tv';
const MENU_PAGE = 'play-page-on-tv';

// Also fires when you hit "reload" on brave://extensions, so menu changes apply immediately.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_LINK,
      title: 'Play YouTube video on TV',
      contexts: ['link'],
      targetUrlPatterns: LINK_PATTERNS,
    });
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: 'Play YouTube video on TV',
      contexts: ['page', 'frame'],
      documentUrlPatterns: PAGE_PATTERNS,
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.menuItemId === MENU_LINK ? info.linkUrl : info.pageUrl;
  handle(url);
});

// The toolbar icon opens popup.html (volume / power / play current tab).

async function handle(url) {
  console.log('[play-on-tv] requested', url);

  const videoId = extractVideoId(url);
  if (!videoId) {
    return feedback(false, 'Not a YouTube video', `No video ID found in ${url ?? 'this page'}`);
  }

  const settings = await getSettings();
  const reason = await notReadyReason(settings);
  if (reason) {
    chrome.runtime.openOptionsPage();
    return feedback(false, 'Not set up yet', reason);
  }

  try {
    await playOnTv(settings, videoId);
    feedback(
      true,
      settings.dryRun ? 'Dry run: not sent' : 'Sent to TV',
      `Video ${videoId} → ${settings.scriptEntity}`,
    );
  } catch (e) {
    console.error('[play-on-tv]', e);
    feedback(false, 'Failed to send to TV', e.message);
  }
}

function feedback(ok, title, message) {
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#1e8e3e' : '#d93025' });
  chrome.action.setBadgeText({ text: ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon192.png',
    title,
    message,
    priority: ok ? 0 : 1,
  });
}
