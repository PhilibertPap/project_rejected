# project_rejected

Daily rejection therapy challenges. https://philibertpap.github.io/project_rejected/

## Rules
- Each day: draw a face-down card, flip it, go do it.
- **Rejected** +2n · **They said yes** +n · **Choked** −n (n = difficulty 1–5).
- Day validated as soon as one card is Rejected or Yes. Streak = consecutive validated days; a choke or a missed day resets it.
- First 5 days: scripted cards (`data/challenges.json` → `scripted`). Then random cards around the player's level, mostly same level, sometimes above, rarely below.
- After the daily card (optional): draw another random card, or play one of your own cards (My cards).
- Journal: one entry per day; visible in the feed if the profile is public, with replies.

## Stack
- Static site (HTML/CSS/JS, no build), GitHub Pages
- Supabase (auth, Postgres + RLS). SQL in `supabase/`, run in order.

## Files
- `data/challenges.json` — card pack, level & draw settings
- `js/game.js` — points, streak, level, draw (no DOM)
- `js/app.js` — auth, tabs · `js/views/*` — one file per tab
- `admin.html` — approve accounts
