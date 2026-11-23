// Pure game logic: points, streak, level, card draw
const Game = (() => {
  const POINTS = { rejected: d => 2 * d, accepted: d => d, choked: d => -d };
  const isDone = a => a.result === "accepted" || a.result === "rejected";
  const byTime = (a, b) => a.created_at.localeCompare(b.created_at);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const pick = list => list[Math.floor(Math.random() * list.length)];

  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => fmt(new Date());
  const addDays = (day, n) => {
    const [y, m, d] = day.split("-").map(Number);
    return fmt(new Date(y, m - 1, d + n));
  };

  const pointsFor = (result, difficulty) => POINTS[result](difficulty);
  const points = a => (a.result ? pointsFor(a.result, a.difficulty) : 0);
  const total = attempts => attempts.reduce((s, a) => s + points(a), 0);

  // A day is validated by one Rejected or Yes. Chokes only cost points.
  const validatedDays = attempts => new Set(attempts.filter(isDone).map(a => a.day));
  const validatedToday = (attempts, now = today()) => validatedDays(attempts).has(now);

  // Current streak: counted back from today (or yesterday if today isn't played yet)
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

  // The card of the day = first Rejected/Yes of that day (or the first card played)
  function dailyCard(dayAttempts) {
    const resolved = dayAttempts.filter(a => a.result).sort(byTime);
    return { card: resolved.find(isDone) || resolved[0] || null, more: resolved.length > 1 };
  }

  // Level moves towards the difficulty you actually handle
  function level(attempts, cfg) {
    let L = cfg.start;
    for (const a of attempts.filter(a => a.result).sort(byTime)) {
      const target = a.result === "choked" ? a.difficulty - cfg.choked_malus : a.difficulty + cfg.done_bonus;
      L = clamp(L + cfg.rate * (target - L), 1, 5);
    }
    return L;
  }

  function weightedOffset(weights) {
    const entries = Object.entries(weights);
    let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of entries) if ((r -= w) <= 0) return Number(k);
    return 0;
  }

  // First card of the day = next scripted card during the intro; otherwise random around level.
  // Choked cards from previous days go back in the deck and come back with backlog_chance.
  function draw(data, attempts, now = today()) {
    const doneIds = new Set(attempts.filter(isDone).map(a => a.challenge_id));
    const todayIds = new Set(attempts.filter(a => a.day === now).map(a => a.challenge_id));
    const scripted = data.scripted.find(c => !doneIds.has(c.id));
    if (scripted && !todayIds.size) return scripted;

    const L = level(attempts, data.level);
    const chokedIds = new Set(attempts.filter(a => a.result === "choked" && a.day !== now).map(a => a.challenge_id));
    const backlog = data.pool.filter(c =>
      chokedIds.has(c.id) && !doneIds.has(c.id) && !todayIds.has(c.id) && Math.abs(c.difficulty - L) <= 1.5);
    if (backlog.length && Math.random() < data.draw.backlog_chance) return pick(backlog);

    const d = clamp(Math.round(L) + weightedOffset(data.draw.offsets), 1, 5);
    const recent = new Set([...attempts].sort(byTime).filter(a => a.result !== "choked")
      .slice(-data.draw.avoid_recent).map(a => a.challenge_id));
    todayIds.forEach(id => recent.add(id));
    const sameLevel = data.pool.filter(c => c.difficulty === d);
    const fresh = sameLevel.filter(c => !recent.has(c.id));
    return pick(fresh.length ? fresh : sameLevel.length ? sameLevel : data.pool);
  }

  return { today, addDays, byTime, isDone, points, pointsFor, total, streak, bestStreak,
           validatedToday, validatedDays, dailyCard, level, draw };
})();
