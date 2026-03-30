# CF-Streak-Firefox-

A full Firefox extension that tracks your Codeforces solving streak (Duolingo-style) for any Codeforces handle.

## Features

- Save your Codeforces username in extension settings.
- Fetches accepted submissions from Codeforces API (`user.status`).
- Calculates:
  - Current streak
  - Longest streak
  - Total solved days
  - Last solved day
- Shows streak health state:
  - ✅ solved today
  - ⚠️ at risk (only solved yesterday)
  - ❌ broken
- Adds streak count as toolbar badge.
- Auto-refreshes every hour using alarms.

## Files

- `manifest.json` – extension config.
- `background.js` – data fetching, streak calculations, badge updates.
- `popup.html`, `popup.css`, `popup.js` – popup UI and interactions.
- `options.html`, `options.css`, `options.js` – username configuration and reset.

## Load in Firefox

1. Open Firefox and go to `about:debugging`.
2. Click **This Firefox**.
3. Click **Load Temporary Add-on**.
4. Select the `manifest.json` file from this project.
5. Open the extension popup and set your Codeforces username.

## Notes

- Streak is computed using UTC day boundaries.
- The extension fetches up to 10,000 submissions per refresh.
- Requires network access to `https://codeforces.com/*`.
