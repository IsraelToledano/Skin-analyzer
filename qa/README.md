# QA for Skin Ritual

Run before every push: `cd qa && npm install && npm test`

- `run-audit.js` — rebuilds the real product library (seed list + every migration), generates 30 days of AM/PM routines exactly as the Day view renders them, and checks each one: cleanser first, oil cleanse followed by a water cleanse, wash-off steps before every leave-on step, layering order, sunscreen every morning and last, no conflicting actives, no duplicate steps, the step cap, and that every product runs at its intended frequency (rotation pools and shared slots judged as groups). `npm run audit` prints every day's plan.
- `sweep.js` — the same audit from 10 start dates, plus microneedling nights and skipped steps.
- `*.test.js` — behavioral tests of the shipped functions, including edge cases and malformed data.
- `*.e2e.js` — Playwright in a phone-sized browser (headless shell at `/opt/pw-browsers/chromium_headless_shell-1194`).
- `add-sweep.js` — simulates "+ Add step" for every product in the library, on every day and session for the next 60 days, through the app's own add path, and checks each resulting day and the day after. This is how missing rules get found before they reach the phone (it found the clay-mask/retinoid gap, the cap bump removing the cleanser, and two masks in one night).
