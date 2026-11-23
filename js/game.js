// Pure game logic. No DOM.
//
// Public "rating": starts at 0, never below 0. Gains scale with difficulty (+15 per level),
// rejection pays double, harder-than-expected cards pay more (Elo-style), the daily card gets a
// streak bonus, extra cards the same day have diminishing returns. Choking costs less than a
// gain (loss aversion) and more when the card was easy for you.
//
// Hidden "skill" (theta, u): Glicko-like estimate of how hard a card you can handle.
// theta = skill, u = uncertainty (big at the start, shrinks with play, grows when idle or
// after a surprising result). Fast completions count as stronger evidence.
const Game = (() => {
  const isDone = a => a.result === "accepted" || a.result === "rejected";
  const byTime = (a, b) => a.created_at.localeCompare(b.created_at);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // ---- dates (local days as YYYY-MM-DD)
  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => fmt(new Date());
  const parse = day => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (day, n) => { const d = parse(day); d.setDate(d.getDate() + n); return fmt(d); };
  const daysBetween = (a, b) => Math.round((Date.UTC(...b.split("-").map((v, i) => i === 1 ? v - 1 : +v)) -
                                            Date.UTC(...a.split("-").map((v, i) => i === 1 ? v - 1 : +v))) / 864e5);

  // ---- streak (day-based only)
  const validatedDays = attempts => new Set(attempts.filter(isDone).map(a => a.day));
  const validatedToday = (attempts, now = today()) => validatedDays(attempts).has(now);
  function streak(attempts, now = today()) {
    const days = validatedDays(attempts);
    let d = days.has(now) ? now : addDays(now, -1), s = 0;
    while (days.has(d)) { s++; d = addDays(d, -1); }
    return s;
  }
  function bestStreak(attempts) {
    let best = 0, cur = 0, prev = null;
    for (const d of [...validatedDays(attempts)].sort()) {
      cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }
  // Card of the day = first Rejected/Yes of that day (or the first card played)
  function dailyCard(dayAttempts) {
    const resolved = dayAttempts.filter(a => a.result).sort(byTime);
    return { card: resolved.find(isDone) || resolved[0] || null, more: resolved.length > 1 };
  }

  // ---- hidden skill (Glicko-like)
  const Q = Math.LN10 / 400;
  const g = u => 1 / Math.sqrt(1 + (3 * Q * Q * u * u) / (Math.PI * Math.PI));
  const cardRating = (d, S) => S.card_rating_step * d + S.card_rating_offset;
  const expected = (st, d, S) => 1 / (1 + Math.pow(10, (-g(st.u) * (st.theta - cardRating(d, S))) / 400));

  const initState = cfg => ({ rating: 0, theta: cfg.skill.start, u: cfg.skill.u_start,
                              lastDay: null, validated: new Set(), doneByDay: {} });
  const clone = st => ({ ...st, validated: new Set(st.validated), doneByDay: { ...st.doneByDay } });

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

  // Raw rating change for a result (before the floor at 0)
  function rawDelta(st, a, result, cfg) {
    const P = cfg.scoring, S = cfg.skill, d = a.difficulty;
    const p = expected(st, d, S);
    const base = P.base + P.per_level * (d - 1);
    const doneToday = st.doneByDay[a.day] || 0;
    if (result === "choked")
      return -Math.round(base * P.choke_mult * (0.5 + p) * (doneToday ? P.choke_extra_mult : 1));
    const extra = doneToday === 0 ? 1 : P.extra_cards[Math.min(doneToday - 1, P.extra_cards.length - 1)];
    const challenge = P.challenge_min + (P.challenge_max - P.challenge_min) * (1 - p);
    const streakBonus = doneToday === 0 ? Math.min(P.streak_bonus_max, P.streak_bonus_per_day * streakBefore(st, a.day)) : 0;
    const res = result === "rejected" ? P.rejected_mult : P.accepted_mult;
    return Math.round(base * res * challenge * extra * (1 + streakBonus));
  }

  function apply(st, a, cfg) {
    const S = cfg.skill;
    idle(st, a.day, S);
    const p = expected(st, a.difficulty, S);
    const before = st.rating;
    st.rating = Math.max(0, st.rating + rawDelta(st, a, a.result, cfg));
    const X = isDone(a) ? 1 : 0;
    const fast = X && a.resolved_at && new Date(a.resolved_at) - new Date(a.created_at) <= S.fast_minutes * 60000;
    st.theta += S.k * (st.u / S.u_start) * (fast ? S.fast_weight : 1) * (X - p);
    st.u = Math.abs(X - p) > S.surprise ? Math.min(S.u_start, st.u * S.surprise_boost) : Math.max(S.u_min, st.u * S.u_decay);
    if (X) { st.doneByDay[a.day] = (st.doneByDay[a.day] || 0) + 1; st.validated.add(a.day); }
    st.lastDay = a.day;
    return st.rating - before;
  }

  // Replays the whole history: final state, per-attempt rating change, rating per day
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

  // What each button would give for a pending card
  function preview(R, attempt, cfg) {
    const out = {};
    for (const r of ["rejected", "accepted", "choked"]) {
      const st = clone(R.st);
      idle(st, attempt.day, cfg.skill);
      out[r] = Math.max(0, st.rating + rawDelta(st, attempt, r, cfg)) - st.rating;
    }
    return out;
  }

  // Difficulty (1-5, continuous) the player handles with ~target_p success
  function comfort(st, cfg) {
    const S = cfg.skill, t = S.target_p;
    const D = st.theta - (400 * Math.log10(t / (1 - t))) / g(st.u);
    return clamp((D - S.card_rating_offset) / S.card_rating_step, 1, 5);
  }

  // ---- card draw
  function weightedIndex(weights) {
    let r = Math.random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) <= 0) return i;
    return weights.length - 1;
  }

  function difficultyWeights(st, cfg) {
    const S = cfg.skill;
    return [1, 2, 3, 4, 5].map(d => Math.exp(-(((expected(st, d, S) - S.target_p) / S.target_width) ** 2)) + S.explore);
  }

  // First card of the day = next scripted card during the intro. Otherwise: difficulty chosen so that
  // success odds are near target_p (stretch zone), choked cards come back with backlog_chance.
  function draw(data, attempts, R, now = today()) {
    const doneIds = new Set(attempts.filter(isDone).map(a => a.challenge_id));
    const todayIds = new Set(attempts.filter(a => a.day === now).map(a => a.challenge_id));
    const scripted = data.scripted.find(c => !doneIds.has(c.id));
    if (scripted && !todayIds.size) return scripted;

    const st = clone(R.st);
    idle(st, now, data.skill);
    const c = comfort(st, data);
    const chokedIds = new Set(attempts.filter(a => a.result === "choked" && a.day !== now).map(a => a.challenge_id));
    const backlog = data.pool.filter(x =>
      chokedIds.has(x.id) && !doneIds.has(x.id) && !todayIds.has(x.id) && Math.abs(x.difficulty - c) <= 1);
    if (backlog.length && Math.random() < data.draw.backlog_chance) return pick(backlog);

    const d = weightedIndex(difficultyWeights(st, data)) + 1;
    const recent = new Set([...attempts].sort(byTime).filter(a => a.result !== "choked")
      .slice(-data.draw.avoid_recent).map(a => a.challenge_id));
    todayIds.forEach(id => recent.add(id));
    const sameLevel = data.pool.filter(x => x.difficulty === d);
    const fresh = sameLevel.filter(x => !recent.has(x.id));
    return pick(fresh.length ? fresh : sameLevel.length ? sameLevel : data.pool);
  }

  return { today, addDays, daysBetween, byTime, isDone, streak, bestStreak, validatedToday, validatedDays,
           dailyCard, replay, preview, comfort, difficultyWeights, expected, draw };
})();
