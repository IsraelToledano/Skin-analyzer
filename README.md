# Skin Ritual — Phone Version

A lightweight, no-AI version of Skin Ritual you can open from your phone, install to your home screen, and use offline. This is the companion to the full **AI-powered version that lives in Claude.ai** (as an artifact in your skincare conversations).

## What's in this repo

| File | Purpose |
|---|---|
| `index.html` | The entire app — calendar, profile, products. Open this on your phone. |
| `manifest.json` | Lets your phone install this as a home-screen app (PWA-lite). |
| `icon.png` | The home-screen icon. |
| `README.md` | This file. |

## Why two versions?

| | **Claude.ai version** (artifact) | **Phone version** (this repo) |
|---|---|---|
| AI skin analysis | ✅ | ❌ |
| AI product scan (photo → product) | ✅ | ❌ |
| AI auto-build routine | ✅ | ❌ (schedule manually instead) |
| Calendar / routine tracking | ✅ | ✅ |
| Product list + conflict warnings | ✅ | ✅ |
| Skin profile + photos | ✅ | ✅ (stored on-device only) |
| Works from your phone's home screen | ❌ | ✅ |
| Data persists reliably | via Claude.ai `window.storage` | via real browser `localStorage` |

The AI features call the Anthropic API. In Claude.ai that's covered by your subscription. A standalone page like this one would need its own paid API key sitting in the page's code — visible to anyone who opens dev tools — so AI features are intentionally left out here. Use the Claude.ai version when you want AI help, and this version for quick day-to-day tracking on your phone.

## Setup — GitHub Pages (one-time)

1. Push these files to the root of this repo (`IsraelToledano/Skin-analyzer`).
2. On GitHub: **Settings → Pages → Source → Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute, your app is live at:
   ```
   https://israeltoledano.github.io/Skin-analyzer/
   ```
4. Open that link on your phone in Safari/Chrome.

## Add to Home Screen

**iPhone (Safari):** open the link → Share button → "Add to Home Screen" → Add.
**Android (Chrome):** open the link → ⋮ menu → "Add to Home screen" / "Install app".

It'll then open full-screen, no browser bar, with the icon from `icon.png`.

## How your data works here

- Everything (products, schedule, photos, skin profile) is saved to **your phone's local browser storage** the moment you change it — no account, no internet needed after the page loads once.
- This data **stays on this device**. It does not automatically appear in the Claude.ai version, or on another phone.

## Moving data between this app and Claude.ai

Tap **⇄ Sync** (top right) in either version:

1. **Export** — copies a block of text to your clipboard containing everything (products, schedule, photos).
2. **Import** — on the other version, paste that text into the Import box and tap "Load This Data."

Both versions use the exact same export format, so copying back and forth always works. There's no automatic two-way sync — you control when data moves, by exporting/importing manually.

**Suggested workflow:** Do AI analysis and routine-building in Claude.ai, then Export → Import into this phone version to carry the results over. Use the phone version day-to-day for checking off your routine; Export → Import back into Claude.ai if you want AI to review what you've actually been doing.

## Updating the app later

If you (or Claude, in a future chat) make changes to `index.html`, just push the updated file to this repo's `main` branch — GitHub Pages redeploys automatically within a minute or two. Refresh the page on your phone to get the update (if it's already installed to your home screen, a normal page refresh while open will pick up the new version).

## Troubleshooting

- **Blank page / nothing loads:** Check you have an internet connection the first time you open it — it loads React from a CDN. After that first load, most of the app still needs network for the CDN scripts, so it's not fully offline-capable yet.
- **HEIC photo upload fails:** iPhones save photos as HEIC by default. Go to **Settings → Camera → Formats → "Most Compatible"** to save as JPEG instead, or use a screenshot.
- **Import says "couldn't read that data":** Make sure you copied the *entire* block of text from Export — it's long and copy/paste can sometimes truncate it.
