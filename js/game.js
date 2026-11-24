// Pure game logic. No DOM.
//
// Two modes:
//  - story: one scripted card a day (cards.mode = 'story', ordered by day; 'sunday' variants on Sundays)
//  - situation: optional cards drawn on the Play page (place, duo, tone, crush filters)
//
// Public rating: starts at 0, never below 0. Base = 100 + 15 per level, rejection pays double,
// a card harder than expected for you pays more (Elo-style), the story card gets a streak bonus.
// Situation cards pay x0.4 with diminishing returns in the day (100/50/25/0 %); their chokes cost half.
//
// Hidden skill (theta, u): Glicko-like estimate used to pick situation cards and weight points.
// Learns from both modes (situation weighted less, duo even less).
//
// Day validated = story card done, or 2 situation cards done. Streak freezes are earned
// (story checkpoints, every N situation cards) and spent automatically on a missed day.
const Game = (() => {
  const isDone = a => a.result === "accepted" || a.result === "rejected";
  const isSit = a => a.mode === "situation";
  const byTime = (a, b) => a.created_at.localeCompare(b.created_at);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // ---- dates (local days, YYYY-MM-DD)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => fmt(new Date());
  const parse = day => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (day, n) => { const d = parse(day); d.setDate(d.getDate() + n); return fmt(d); };
  const utc = day => { const [y, m, d] = day.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  const isSunday = day => parse(day).getDay() === 0;

  // ---- validated days, streak with freezes
  function validatedDays(attempts) {
    const story = new Set(), sit = {};
    for (const a of attempts) {
      if (!isDone(a)) continue;
      if (isSit(a)) sit[a.day] = (sit[a.day] || 0) + 1;
      else story.add(a.day);
    }
    for (const [d, n] of Object.entries(sit)) if (n >= 2) story.add(d);
    return story;
  }
  const validatedToday = (attempts, now = today()) => validatedDays(attempts).has(now);

  // Walks every day from the first activity to today. Freezes are earned on story checkpoints and
  // every `freeze_per_situation` situation cards done; a missed day (before today) uses one if available.
  function streakInfo(attempts, cards, cfg, now = today()) {
    const days = validatedDays(attempts);
    const checkpoints = new Set(cards.filter(c => c.checkpoint).map(c => c.id));
    const earnedOn = {};
    let sitCount = 0;
    for (const a of [...attempts].filter(isDone).sort(byTime)) {
      if (!isSit(a) && checkpoints.has(a.challenge_id)) earnedOn[a.day] = (earnedOn[a.day] || 0) + 1;
      if (isSit(a) && ++sitCount % cfg.streak.freeze_per_situation === 0) earnedOn[a.day] = (earnedOn[a.day] || 0) + 1;
    }
    const first = [...days].sort()[0];
    let current = 0, best = 0, freezes = 0, frozen = [];
    if (first) {
      for (let d = first; d <= now; d = addDays(d, 1)) {
        if (days.has(d)) current++;
        else if (d < now) {
          if (freezes > 0 && current > 0) { freezes--; frozen.push(d); }
          else current = 0;
        }
        best = Math.max(best, current);
        freezes = Math.min(cfg.streak.freeze_max, freezes + (earnedOn[d] || 0));
      }
    }
    return { current, best, freezes, frozen };
  }

  // ---- story progression
  function storyState(cards, attempts, now = today(), skipped = null) {
    const story = cards.filter(c => c.mode === "story" && c.active).sort((a, b) => a.day - b.day);
    const done = new Set(attempts.filter(a => !isSit(a) && isDone(a)).map(a => a.challenge_id));
    const remaining = story.filter(c => !done.has(c.id));
    const doneToday = attempts.some(a => a.day === now && !isSit(a) && isDone(a));
    const next = remaining[0] || null;
    let card = null, swapped = false;
    if (!doneToday && next) {
      if (isSunday(now)) {
        card = cards.find(c => c.mode === "sunday" && c.active && c.week === next.week) || next;
      } else if (skipped === next.id) {
        const alt = remaining.find(c => c.week === next.week && !c.checkpoint && c.id !== next.id);
        if (alt) { card = alt; swapped = true; }
        else card = next;
      } else card = next;
    }
    const canSwap = !!(card && card.mode === "story" && !card.checkpoint && !swapped && !isSunday(now) &&
      remaining.some(c => c.week === card.week && !c.checkpoint && c.id !== card.id));
    return { story, remaining, card, doneToday, swapped, canSwap,
             position: story.length - remaining.length + (doneToday ? 0 : 1), total: story.length,
             finished: remaining.length === 0, week: next ? next.week : null };
  }

  // ---- hidden skill (Glicko-like) + rating
  const Q = Math.LN10 / 400;
  const g = u => 1 / Math.sqrt(1 + (3 * Q * Q * u * u) / (Math.PI * Math.PI));
  const cardRating = (d, S) => S.card_rating_step * d + S.card_rating_offset;
  const expected = (st, d, S) => 1 / (1 + Math.pow(10, (-g(st.u) * (st.theta - cardRating(d, S))) / 400));

  const initState = cfg => ({ rating: 0, theta: cfg.skill.start, u: cfg.skill.u_start, lastDay: null,
                              validated: new Set(), storyByDay: {}, sitByDay: {} });
  const clone = st => ({ ...st, validated: new Set(st.validated), storyByDay: { ...st.storyByDay }, sitByDay: { ...st.sitByDay } });

  function idle(st, day, S) {
    if (!st.lastDay || day === st.lastDay) return;
    const gap = daysBetween(st.lastDay, day) - 1;
    if (gap > 0) st.u = Math.min(S.u_start, Math.sqrt(st.u ** 2 + S.u_idle_per_day ** 2 * gap));
  }
  function streakBefore(st, day) {
    let d = addDays(day, -1), s = 0;
    while (st.validated.has(d)) { s++; d = addDays(d, -1); }
    return s;
  }

  function rawDelta(st, a, result, cfg) {
    const P = cfg.scoring, S = cfg.skill, d = a.difficulty;
    const p = expected(st, d, S);
    const base = P.base + P.per_level * (d - 1);
    const sit = isSit(a);
    if (result === "choked") {
      const doneStory = st.storyByDay[a.day] || 0;
      let v = base * P.choke_mult * (0.5 + p);
      if (sit) v *= P.situation_choke_mult;
      else if (doneStory) v *= P.choke_extra_mult;
      return -Math.round(v);
    }
    const challenge = P.challenge_min + (P.challenge_max - P.challenge_min) * (1 - p);
    const res = result === "rejected" ? P.rejected_mult : P.accepted_mult;
    if (sit) {
      const n = st.sitByDay[a.day] || 0;
      const k = P.situation_daily[Math.min(n, P.situation_daily.length - 1)];
      return Math.round(base * res * challenge * P.situation_mult * k);
    }
    const n = st.storyByDay[a.day] || 0;
    const extra = n === 0 ? 1 : P.extra_cards[Math.min(n - 1, P.extra_cards.length - 1)];
    const bonus = n === 0 ? Math.min(P.streak_bonus_max, P.streak_bonus_per_day * streakBefore(st, a.day)) : 0;
    return Math.round(base * res * challenge * extra * (1 + bonus));
  }

  function apply(st, a, cfg) {
    const S = cfg.skill;
    idle(st, a.day, S);
    const p = expected(st, a.difficulty, S);
    const before = st.rating;
    st.rating = Math.max(0, st.rating + rawDelta(st, a, a.result, cfg));
    const X = isDone(a) ? 1 : 0;
    const fast = X && a.resolved_at && new Date(a.resolved_at) - new Date(a.created_at) <= S.fast_minutes * 60000;
    const weight = isSit(a) ? (a.duo ? S.duo_weight : S.situation_weight) : 1;
    st.theta += S.k * (st.u / S.u_start) * weight * (fast ? S.fast_weight : 1) * (X - p);
    const surprise = Math.abs(X - p) > S.surprise && weight === 1;
    st.u = surprise ? Math.min(S.u_start, st.u * S.surprise_boost) : Math.max(S.u_min, st.u * (1 - (1 - S.u_decay) * weight));
    if (X) {
      if (isSit(a)) { st.sitByDay[a.day] = (st.sitByDay[a.day] || 0) + 1; if (st.sitByDay[a.day] >= 2) st.validated.add(a.day); }
      else { st.storyByDay[a.day] = (st.storyByDay[a.day] || 0) + 1; st.validated.add(a.day); }
    }
    st.lastDay = a.day;
    return st.rating - before;
  }

  function replay(attempts, cfg) {
    const st = initState(cfg), deltas = {}, history = [];
    for (const a of attempts.filter(a => a.result).sort(byTime)) {
      deltas[a.id] = apply(st, a, cfg);
      const last = history[history.length - 1];
      if (last && last.day === a.day) last.rating = st.rating;
      else history.push({ day: a.day, rating: st.rating });
    }
    return { st, deltas, history };
  }

  function preview(R, attempt, cfg) {
    const out = {};
    for (const r of ["rejected", "accepted", "choked"]) {
      const st = clone(R.st);
      idle(st, attempt.day, cfg.skill);
      out[r] = Math.max(0, st.rating + rawDelta(st, attempt, r, cfg)) - st.rating;
    }
    return out;
  }

  function comfort(st, cfg) {
    const S = cfg.skill, t = S.target_p;
    const D = st.theta - (400 * Math.log10(t / (1 - t))) / g(st.u);
    return clamp((D - S.card_rating_offset) / S.card_rating_step, 1, 5);
  }

  // ---- situation draw
  function weightedIndex(weights) {
    let r = Math.random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) <= 0) return i;
    return weights.length - 1;
  }

  // opts: { place: 'any' | <place>, duo (cards for two), crush (shown as Flirt), tone: 'serious' (Progress) | 'fun' }
  function situationPool(cards, cfg, opts) {
    const base = cards.filter(c => c.mode === "situation" && c.active);
    const inPlace = c => (opts.place === "any" ? cfg.anywhere.includes(c.place) : c.place === opts.place);
    const match = c => c.tone === opts.tone && c.duo === !!opts.duo && c.crush === !!opts.crush;
    const filters = [c => inPlace(c) && match(c), match];  // relax the place only
    for (const f of filters) { const pool = base.filter(f); if (pool.length) return pool; }
    return [];
  }

  function drawSituation(cards, attempts, R, cfg, opts, now = today()) {
    const all = situationPool(cards, cfg, opts);
    const pool = all.filter(x => x.id !== opts.exclude).length ? all.filter(x => x.id !== opts.exclude) : all;  // reroll: not the same card
    if (!pool.length) return null;
    const st = clone(R.st);
    idle(st, now, cfg.skill);
    const todayIds = new Set(attempts.filter(a => a.day === now).map(a => a.challenge_id));
    const doneIds = new Set(attempts.filter(isDone).map(a => a.challenge_id));
    const chokedIds = new Set(attempts.filter(a => a.result === "choked" && a.day !== now).map(a => a.challenge_id));
    const c = comfort(st, cfg);
    const backlog = pool.filter(x => chokedIds.has(x.id) && !doneIds.has(x.id) && !todayIds.has(x.id) && Math.abs(x.difficulty - c) <= 1);
    if (backlog.length && Math.random() < cfg.draw.backlog_chance) return pick(backlog);

    // Fresh = not drawn today and not among the last N cards. Pick the level among fresh cards,
    // so a level with a single card can't come back again and again.
    const S = cfg.skill;
    const recent = new Set([...attempts].sort(byTime).slice(-cfg.draw.avoid_recent).map(a => a.challenge_id));
    const notToday = pool.filter(x => !todayIds.has(x.id));
    const fresh = notToday.filter(x => !recent.has(x.id));
    const from = fresh.length ? fresh : notToday.length ? notToday : pool;
    const levels = [...new Set(from.map(x => x.difficulty))].sort();
    const weights = levels.map(d => Math.exp(-(((expected(st, d, S) - S.target_p) / S.target_width) ** 2)) + S.explore);
    const d = levels[weightedIndex(weights)];
    return pick(from.filter(x => x.difficulty === d));
  }

  // ---- collection
  function collection(attempts) {
    const out = {};
    for (const a of attempts.filter(isDone)) {
      const e = out[a.challenge_id] || (out[a.challenge_id] = { count: 0, rejected: false });
      e.count++;
      if (a.result === "rejected") e.rejected = true;
    }
    return out;
  }

  // Card of the day for summaries: the story card if any, else the first done card
  function dailyCard(dayAttempts) {
    const resolved = dayAttempts.filter(a => a.result).sort(byTime);
    const story = resolved.filter(a => !isSit(a));
    const card = story.find(isDone) || resolved.find(isDone) || story[0] || resolved[0] || null;
    return { card, more: resolved.length > 1 };
  }

  return { today, addDays, daysBetween, isSunday, byTime, isDone, isSit, validatedDays, validatedToday, streakInfo,
           storyState, replay, preview, comfort, expected, drawSituation, situationPool, collection, dailyCard };
})();
