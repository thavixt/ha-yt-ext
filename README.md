# Play on TV (Home Assistant)

A Chromium extension (Chrome, Brave, Edge) that sends YouTube videos to your TV through a Home Assistant script, and gives you a small popup to control the TV.

- **Right-click a YouTube link** → *Play YouTube video on TV*
- **Right-click a YouTube watch/shorts/live page** → *Play this video on TV*
- **Toolbar popup**: play the current tab's video, volume −/+/mute, volume presets, TV on/off, live TV state

The extension does not talk to the TV directly. It starts a Home Assistant script with the video ID, so all TV-specific logic (power on, launching YouTube, casting) lives in HA.

## Requirements

- A Home Assistant **script** that accepts a video ID variable and plays it on your TV.
  The extension calls `script.turn_on` with `variables: { video_id: "<11-char id>" }`, so it returns immediately instead of waiting for the script to finish.
- A `media_player` entity for the TV (for the popup controls).
- A **long-lived access token** (HA → Profile → Security).

## Install

1. Open `brave://extensions` (or `chrome://extensions`) and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open the extension's **Options**, enter your HA URL and token, and click **Save** (the browser asks for access to that host only).
4. Click **Test connection**. It checks the token and that every configured entity exists.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Play script | `script.tv_play_youtube_video` | Started with the video ID |
| Video ID variable name | `video_id` | Field name the play script reads |
| TV media player | `media_player.living_room_vidaa_smart_tv` | State, volume, mute |
| Turn-on script | `script.tv_on` | `-` → `media_player.turn_on` |
| Turn-off script | `script.tv_turn_off` | `-` → `media_player.turn_off` |
| Volume presets | `10, 14, 20` | Percent; `-` hides the presets |
| Dry run | off | Logs requests to the console instead of sending them |

Empty fields fall back to the default. **Reset to defaults** keeps the URL and token.

## Development

No build step and no dependencies. Node is only used for tests and a CLI helper.

```sh
npm test                                   # unit tests (URL parsing, settings)
npm run send -- --test                     # check HA connection + entities
npm run send -- "https://youtu.be/ID" --dry  # show the request without sending
npm run send -- "https://youtu.be/ID"        # really play it on the TV
npm run zip                                # package into ha-yt-ext.zip
```

`npm run send` reads `HOME_ASSISTANT_URL` and `HOME_ASSISTANT_ACCESS_TOKEN` from `.env` (gitignored). Any setting can be overridden there as `HA_<SETTING>`, e.g. `HA_VIDEOVARIABLE=id`.

**Iterating in the browser** (turn on *Dry run* so the TV stays off):

| Changed | Do |
|---|---|
| `background.js`, `lib/*`, `manifest.json` | Click ⟳ on the extension card |
| `popup.*` | Right-click the toolbar icon → *Inspect popup*, then Ctrl+R in DevTools |
| `options.*` | Refresh the options tab |

Background logs: extension card → **Inspect views: service worker**.

## Layout

```
manifest.json      MV3 manifest
background.js      context menu items, notifications
popup.html/.js     toolbar popup (play, volume, power)
options.html/.js   settings page
lib/youtube.js     video ID extraction + URL patterns
lib/ha.js          Home Assistant REST calls
lib/settings.js    defaults, storage, permission checks
scripts/send.mjs   CLI: send a URL to HA using .env
test/              node --test unit tests
icons/             Home Assistant logo
```
