# Play on TV (Home Assistant)

A Chromium extension that sends YouTube videos to your TV through a Home Assistant script, and gives you a small popup to control the TV.

- **Right-click a YouTube link** → _Play YouTube video on TV_
- **Right-click a YouTube watch/shorts/live page** → _Play this video on TV_
- **Toolbar popup**: play the current tab's video, volume −/+/mute, volume presets, TV on/off, live TV state

The extension does not talk to the TV directly. It starts a Home Assistant script with the video ID, so all TV-specific logic (power on, launching YouTube, casting) lives in HA.

> **Unofficial.** This is a personal project. It is not affiliated with, endorsed by, or supported by Home Assistant, the Open Home Foundation, or YouTube/Google. The Home Assistant logo is used only as the extension icon and remains a trademark of its owners.

## Requirements

- A Home Assistant **script** that accepts a video ID variable and plays it on your TV.
  The extension calls `script.turn_on` with `variables: { video_id: "<11-char id>" }`, so it returns immediately instead of waiting for the script to finish.
- A `media_player` entity for the TV (for the popup controls).
- A **long-lived access token** (HA → Profile → Security).

Example play script for a Cast-capable TV (Chromecast / Google TV). Adapt the action to your TV's integration:

```yaml
play_youtube_on_tv:
  alias: Play YouTube on TV
  fields:
    video_id:
      selector:
        text:
  sequence:
    - action: media_player.play_media
      target:
        entity_id: media_player.tv
      data:
        media_content_type: cast
        media_content_id: '{"app_name": "youtube", "media_id": "{{ video_id }}"}'
```

## Install

1. Open `brave://extensions` (or `chrome://extensions`) and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open the extension's **Options**, enter your HA URL and token, and click **Save** (the browser asks for access to that host only).
4. Click **Test connection**. It checks the token and that every configured entity exists.

## Settings

| Setting                | Default                     | Notes                                                    |
| ---------------------- | --------------------------- | -------------------------------------------------------- |
| Play script            | `script.play_youtube_on_tv` | Started with the video ID                                |
| Video ID variable name | `video_id`                  | Field name the play script reads                         |
| TV media player        | `media_player.tv`           | State, volume, mute                                      |
| Turn-on script         | none                        | Optional; without one, `media_player.turn_on` is called  |
| Turn-off script        | none                        | Optional; without one, `media_player.turn_off` is called |
| Volume presets         | `10, 20, 30`                | Percent; `-` hides the presets                           |
| Dry run                | off                         | Logs requests to the console instead of sending them     |

Empty fields fall back to the default, and `-` means "none" for the optional fields. **Reset to defaults** keeps the URL and token.

## Development, testing

No build step and no dependencies. Node is only used for tests and a CLI helper.

```sh
npm test                                   # unit tests (URL parsing, settings)
npm run send -- --test                     # check HA connection + entities
npm run send -- "https://youtu.be/ID" --dry  # show the request without sending
npm run send -- "https://youtu.be/ID"        # really play it on the TV
```

`npm run send` reads `HOME_ASSISTANT_URL` and `HOME_ASSISTANT_ACCESS_TOKEN` from `.env` (gitignored). Any setting can be overridden there as `HA_<SETTING>`, e.g. `HA_VIDEOVARIABLE=id`.

**Iterating in the browser** (turn on _Dry run_ so the TV stays off):

| Changed                                   | Do                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `background.js`, `lib/*`, `manifest.json` | Click ⟳ on the extension card                                           |
| `popup.*`                                 | Right-click the toolbar icon → _Inspect popup_, then Ctrl+R in DevTools |
| `options.*`                               | Refresh the options tab                                                 |

Background logs: extension card → **Inspect views: service worker**.
