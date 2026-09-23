# 🏐 Synergy V-Board

A mobile-friendly volleyball scoreboard Progressive Web App (PWA) built for **Synergy**, a Burbank Parks & Recreation youth volleyball team. Add it to your phone's home screen and use it courtside to track live match scores.

Live app: **https://larul06.github.io/synergy-v-board/**

## Features

### Scoreboard (core)
- Increment/decrement score buttons for both teams.
- Best-of-3 match format with automatic set completion detection.
- Burbank Parks & Rec youth scoring rules: Sets 1 and 2 play to 21 points, the deciding Set 3 plays to 15 points, all sets win by 2.
- Set-by-set score history display with the winner of each completed set.
- Match winner banner when a team wins 2 sets.
- **Reset button** with two-stage behavior:
  - First press: resets the current set's score to 0-0.
  - Second press (or if already 0-0): resets the entire match (scores, sets, set history).

### Practice vs. Tournament tabs
- **Practice tab**: freeform mode with editable "Team A" / "Team B" names — use for practices, scrimmages, or any non-scheduled game.
- **Tournament tab**: pulls from `schedule.json` (Synergy's real season schedule) via a Week dropdown.
  - Automatically pre-selects the next upcoming game based on today's date.
  - Locks team names to Synergy vs. the scheduled opponent, and shows date/time/location and home/away status.
  - Automatically arranges the left/right sides so the home team display matches context.
  - If the selected week's game is already completed, its final score is loaded read-only into the set history view.

### Swap sides
- A small rotated double-arrow button between the two team panels swaps which side (left/right) each team is displayed on, **without resetting or altering scores**. This is a purely visual "slot" swap — useful when teams physically switch sides of the court between sets, so you always keep tapping the correct on-screen side for the team in front of you.

### Match history & persistence
- Completed tournament matches are automatically saved (in the browser's `localStorage`) once a match ends, keyed by schedule week, recorded from **Synergy's perspective** regardless of visual side/swap state.
- A "Synergy Match History" panel (shown in the Tournament tab) lists all completed games — combining live-saved results with pre-seeded historical results already in `schedule.json` — with per-set scores and win/loss outcome.

### Sharing / QR code
- A "📱 QR Code" link next to the app title opens a modal with a QR code (`qr-code.png`) that scans directly to the hosted app, so teammates/parents can quickly open the scoreboard on their own phones.

### Mobile / iPhone specific
- Installable as a home-screen PWA (`manifest.json`, `service-worker.js` for offline caching).
- `viewport-fit=cover` + `env(safe-area-inset-*)` padding so content isn't crowded by the iPhone notch or home-indicator bar.
- Fixed viewport scale (`user-scalable=no`, `touch-action: manipulation`) to prevent the double/triple-tap zoom that iOS Safari otherwise triggers on rapidly tapped +/- buttons.
- **Screen Wake Lock**: requests `navigator.wakeLock` on load and on every score tap so the phone screen doesn't auto-lock mid-match. Re-acquires automatically when the app returns to the foreground (the OS releases the lock while backgrounded). Requires iOS Safari 16.4+ or a recent Android Chrome; fails silently (falls back to normal auto-lock behavior) on unsupported browsers.
- Responsive layout tuned at a `max-width: 480px` breakpoint for phone-width screens.

## Tech stack

Plain HTML/CSS/JavaScript — no build step, no frameworks, no dependencies. Just static files served as-is, which keeps it simple to host on GitHub Pages and easy to run fully offline once cached by the service worker.

| File | Purpose |
|---|---|
| `index.html` | Page structure: header, tabs, tournament panel, scoreboard, set history, match history panel, QR modal. |
| `style.css` | All styling, including the mobile-width media query. |
| `script.js` | App logic: scoring, set/match rules, tab switching, tournament schedule loading, slot-based side-swap, match history persistence, wake lock. |
| `schedule.json` | Synergy's full season schedule (10 weeks) for the Tournament tab, including pre-recorded results for completed games. |
| `manifest.json` | PWA manifest (name, icons, theme color, display mode) for "Add to Home Screen". |
| `service-worker.js` | Caches app assets for offline use; network-first fetch strategy so updates show up as soon as they're available. |
| `icon.svg` / `qr-code.png` | App icon and shareable QR code image. |

## Running locally

No build tools required — just serve the folder statically, for example:

```powershell
python -m http.server 8090
```

Then open `http://localhost:8090/` in a browser.

## Deployment

The app is hosted on **GitHub Pages** from the `main` branch of `larul06/synergy-v-board`. Pushing to `main` triggers a Pages rebuild automatically; no separate build/deploy step is needed since the site is fully static.

## Data source

`schedule.json` was built from Synergy's official 7th & 8th Grade Division schedule published on the [Burbank Parks & Recreation league site](https://burbankparksandrecreation.teamsidelinesite.com/schedule?divisionid=738745), including the full 13-team roster and all 10 weeks of Synergy's matchups (dates, times, location, home/away, and bye week).
