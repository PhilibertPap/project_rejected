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

  // Streak = consecutive days with a done card. A choke resets it; a missed day resets it.
  function streak(attempts, now = today()) {
    let s = 0, prevDay = null, countedDay = null;
    for (const a of attempts.filter(a => a.result).sort(byTime)) {
      if (a.day !== prevDay) {
        if (prevDay && a.day !== addDays(prevDay, 1)) s = 0;
        prevDay = a.day;
      }
      if (a.result === "choked") { s = 0; countedDay = null; }
      else if (countedDay !== a.day) { s += 1; countedDay = a.day; }
    }
    if (prevDay !== now && prevDay !== addDays(now, -1)) s = 0;
    return s;
  }

  const validatedToday = (attempts, now = today()) =>
    attempts.some(a => a.day === now && isDone(a));

  // Level moves towards the difficulty you actually handle (slightly above if done, below if choked)
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

  // First card of the day = next scripted card while the intro isn't finished; otherwise random around level
  function draw(data, attempts, now = today()) {
    const doneIds = new Set(attempts.filter(isDone).map(a => a.challenge_id));
    const playedToday = attempts.some(a => a.day === now);
    const scripted = data.scripted.find(c => !doneIds.has(c.id));
    if (scripted && !playedToday) return scripted;

    const d = clamp(Math.round(level(attempts, data.level)) + weightedOffset(data.draw.offsets), 1, 5);
    const recent = new Set([...attempts].sort(byTime).slice(-data.draw.avoid_recent).map(a => a.challenge_id));
    const sameLevel = data.pool.filter(c => c.difficulty === d);
    const fresh = sameLevel.filter(c => !recent.has(c.id));
    return pick(fresh.length ? fresh : sameLevel.length ? sameLevel : data.pool);
  }

  return { today, addDays, points, pointsFor, total, streak, validatedToday, level, draw, isDone };
})();
