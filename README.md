# project_rejected

Daily rejection therapy challenges. https://philibertpap.github.io/project_rejected/

## Rules
- Each day: draw a face-down card, flip it, go do it. Rejected / They said yes / Choked.
- Day validated by one Rejected or Yes. Streak = consecutive validated days. A choke only costs rating; the card goes back in the deck.
- First 5 days: scripted cards. Then cards are picked by the hidden skill (see below).
- After the daily card (optional): another random card, or one of your own cards (My cards).
- Journal: unlimited private entries, max one public entry per day (feed, 👍/💪 reactions, replies).
- Admin account: admin interface only.

## Rating (public) — `scoring` in challenges.json
- Starts at 0, never below 0. Base = 100 + 15 × (difficulty − 1).
- Yes = base, Rejected = 2 × base. × 0.75–1.25 depending on how hard the card was *for you* (Elo-style).
- Daily card: + 2 % per streak day (max + 30 %). Extra cards the same day: × 0.5, 0.25, 0.1.
- Choked: about −20 to −60 (more if the card was easy for you, halved on extra cards).

## Skill (hidden) — `skill` in challenges.json
- Glicko-like: skill θ + uncertainty u. Each card has a rating; P(go) = logistic(θ − card), flattened by u.
- u is high at the start (big moves), shrinks with play, grows when idle or after a surprise (choking an easy card late).
- Done within 30 min of the draw = stronger evidence.
- Card draw: difficulties weighted so that P(go) ≈ 78 % (stretch zone), with a bit of exploration.

## Stack
- Static site (HTML/CSS/JS, no build), GitHub Pages
- Supabase (auth, Postgres + RLS). SQL in `supabase/`, run in order.

## Files
- `data/challenges.json` — card pack, level & draw settings
- `js/game.js` — points, streak, level, draw (no DOM)
- `js/app.js` — auth, tabs · `js/views/*` — one file per tab
