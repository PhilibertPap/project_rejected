# project_rejected

Daily rejection therapy challenges. https://philibertpap.github.io/project_rejected/

## Rules
- **Story tab**: one scripted card a day, 30 days (Season 1), then a new card a day (Season 2). Sunday = the week's Sunday variant. "Not today" swaps with the next card of the week (checkpoint stays last).
- **Side quests tab (situation cards)**: optional cards; one Draw button, optional chips (place, with a friend, Fun, Crush from day 15). One reroll per draw.
- **Deck**: every card done (Rejected or Yes) is collected; a no gives it a white edge.
- Day validated = story card done, or 2 situation cards done. Streak freezes (max 2) are earned on story checkpoints and every 10 situation cards, spent automatically on a missed day.
- Journal, Feed, Admin as before. Game design doc: Claude Doc "Project Rejected — Game design & cartes".

## Cards
- Cards live in Supabase (table `cards`). Edit them in the admin **Cards** tab (search, edit, add, untick Active to hide, delete).
- `tools/cards.py` holds the original catalogue and generates `supabase/cards_seed.sql` (initial seed, run once — re-running overwrites admin edits on the same ids).
- Ids: `d1`…`d30` story, `sun1`… Sunday variants, `s-<place>-<slug>` situation.
- Scoring / skill settings: `data/config.json`.

## Rating (public) — `scoring` in data/config.json
- Starts at 0, never below 0. Base = 100 + 15 × (difficulty − 1).
- Yes = base, Rejected = 2 × base. × 0.75–1.25 depending on how hard the card was *for you* (Elo-style).
- Daily card: + 2 % per streak day (max + 30 %). Side quests: × 0.4, then 100 / 50 / 25 / 0 % within the day; their chokes cost half.
- Choked: about −20 to −60 (more if the card was easy for you, halved on extra cards).

## Skill (hidden) — `skill` in data/config.json
- Glicko-like: skill θ + uncertainty u. Each card has a rating; P(go) = logistic(θ − card), flattened by u.
- u is high at the start (big moves), shrinks with play, grows when idle or after a surprise (choking an easy card late).
- Done within 30 min of the draw = stronger evidence.
- Card draw: difficulties weighted so that P(go) ≈ 78 % (stretch zone), with a bit of exploration.

## Rollback
- Tags mark stable versions: `git tag` to list, `git checkout <tag> -- .` then commit to go back.

## Stack
- Static site (HTML/CSS/JS, no build), GitHub Pages
- Supabase (auth, Postgres + RLS). SQL in `supabase/`, run in order.

## Files
- `data/config.json` — scoring, hidden skill, draw and streak settings
- `js/game.js` — story progression, points, streak, skill, situation draw, collection (no DOM)
- `js/app.js` — auth, data loading, tabs · `js/views/*` — one file per tab (`cardui.js` = shared card UI)
- `tools/cards.py` — card catalogue → seed SQL
- `css/style.css` — themes (night / day / black) as CSS variables at the top; one accent colour per tab
- `fonts/` — Archivo Black + Instrument Sans (OFL, self-hosted)
