// Stat tiles + analytics tabs (Week / Heatmap / Rating / Stats)
// Colors: one-hue ordinal ramp (validated: monotone, visible steps, light end >= 2:1 on surface)
// Dark surface #0e0e0f: brighter = better day (validated ordinal ramp)
const VIZ = {
  empty: "#1f1f22", choked: "#184f95", accepted: "#3987e5", rejected: "#86b6ef",
  line: "#f2f2f0", grid: "#2a2a2e", surface: "#0e0e0f",
};
const STATE_LABEL = { choked: "Choked", accepted: "Yes", rejected: "Rejected" };
const ANALYTICS_TABS = ["Week", "Heatmap", "Rating", "Stats"];
const fmtNum = n => n.toLocaleString("en-GB");

function refreshRating() { state.R = Game.replay(state.attempts, state.data); }

// ---- tooltip (single, shared)
const tip = (() => {
  let t = null;
  return {
    show(target, text) {
      if (!t) t = document.body.appendChild(h("div", { class: "viz-tip", role: "tooltip" }));
      t.textContent = text;
      t.hidden = false;
      const r = target.getBoundingClientRect();
      t.style.left = `${r.left + r.width / 2 + window.scrollX}px`;
      t.style.top = `${r.top + window.scrollY - 6}px`;
    },
    at(x, y, text) {
      if (!t) t = document.body.appendChild(h("div", { class: "viz-tip", role: "tooltip" }));
      t.textContent = text;
      t.hidden = false;
      t.style.left = `${x + window.scrollX}px`;
      t.style.top = `${y + window.scrollY - 6}px`;
    },
    hide() { if (t) t.hidden = true; },
  };
})();

function hoverable(node, text) {
  node.setAttribute("tabindex", "0");
  node.setAttribute("aria-label", text);
  node.addEventListener("pointerenter", () => tip.show(node, text));
  node.addEventListener("pointerleave", tip.hide);
  node.addEventListener("focus", () => tip.show(node, text));
  node.addEventListener("blur", tip.hide);
  return node;
}

// Best result of each day: rejected > yes > choked
function dayStates() {
  const byDay = {};
  for (const a of state.attempts.filter(a => a.result)) (byDay[a.day] = byDay[a.day] || []).push(a);
  const out = {};
  for (const [day, list] of Object.entries(byDay)) {
    const best = list.some(a => a.result === "rejected") ? "rejected" : list.some(a => a.result === "accepted") ? "accepted" : "choked";
    out[day] = { state: best, title: Game.dailyCard(list).card.title, count: list.length };
  }
  return out;
}

function ratingAt(day) {
  let r = 0;
  for (const p of state.R.history) { if (p.day <= day) r = p.rating; else break; }
  return r;
}

const shortDay = day => fmtDay(day, { weekday: "short", day: "numeric", month: "short" });
const dayText = (day, s) => `${shortDay(day)} · ${s ? `${STATE_LABEL[s.state]} — ${s.title}${s.count > 1 ? ` (+${s.count - 1})` : ""}` : "No card"}`;

// ---- stat tiles (above the card)
function statTiles() {
  const now = Game.today();
  const todays = state.attempts.filter(a => a.day === now && a.result);
  const todayDelta = todays.reduce((s, a) => s + (state.R.deltas[a.id] || 0), 0);
  const week = [...Array(7)].map((_, i) => Game.addDays(now, i - 6));
  const validated = Game.validatedDays(state.attempts);
  const weekCount = week.filter(d => validated.has(d)).length;
  const deltaCls = todayDelta > 0 ? "up" : todayDelta < 0 ? "down" : "";

  const tile = (label, value, sub, subCls = "") =>
    h("div", { class: "tile" }, h("span", { class: "tile-label" }, label),
      h("span", { class: "tile-value" }, value), h("span", { class: `tile-sub ${subCls}` }, sub));

  return h("div", { class: "tiles" },
    tile("Rating", fmtNum(state.R.st.rating), todays.length ? `${fmtPts(todayDelta)} today` : "—", deltaCls),
    tile("Streak", `${streak().current}`, `best ${streak().best}${streak().freezes ? ` · ❄ ${streak().freezes}` : ""}`),
    tile("This week", `${weekCount}/7`, "days validated"));
}

// ---- tabs
function analyticsTabs() {
  let current = "Week";
  try { current = localStorage.getItem("analyticsTab") || "Week"; } catch (_) {}
  if (!ANALYTICS_TABS.includes(current)) current = "Week";
  const panel = h("div", { class: "tab-panel" });
  const bar = h("div", { class: "tabs", role: "tablist" });
  const select = name => {
    current = name;
    try { localStorage.setItem("analyticsTab", name); } catch (_) {}
    bar.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.textContent === name));
    tip.hide();
    const states = dayStates();
    mount(panel, { Week: () => weekView(states), Heatmap: () => heatmapView(states), Rating: ratingView, Stats: statsView }[name]());
  };
  ANALYTICS_TABS.forEach(n => bar.append(h("button", { class: "tab", role: "tab", onclick: () => select(n) }, n)));
  const wrap = h("section", { class: "analytics" }, bar, panel);
  select(current);
  return wrap;
}

function legend() {
  return h("div", { class: "legend" },
    [["empty", "No card"], ["choked", "Choked"], ["accepted", "Yes"], ["rejected", "Rejected"]].map(([k, label]) =>
      h("span", {}, h("i", { class: "swatch", style: `background:${VIZ[k]}` }), label)));
}

// ---- Week
function weekView(states) {
  const now = Game.today();
  const days = [...Array(7)].map((_, i) => Game.addDays(now, i - 6));
  const weekAttempts = state.attempts.filter(a => a.result && a.day >= days[0]);
  const gained = state.R.st.rating - ratingAt(Game.addDays(days[0], -1));
  const rejections = weekAttempts.filter(a => a.result === "rejected").length;
  const vd = Game.validatedDays(state.attempts);
  const validated = days.filter(d => vd.has(d)).length;

  return [
    h("div", { class: "week" }, days.map(d => {
      const s = states[d];
      return h("div", { class: "week-day" },
        hoverable(h("div", { class: `cell-lg${d === now ? " is-today" : ""}`, style: `background:${s ? VIZ[s.state] : VIZ.empty}` }), dayText(d, s)),
        h("span", { class: "muted small" }, fmtDay(d, { weekday: "narrow" })));
    })),
    h("p", { class: "muted small center" },
      `${validated}/7 days · ${rejections} rejection${rejections === 1 ? "" : "s"} · ${fmtPts(gained)} rating`),
    legend(),
  ];
}

// ---- Heatmap (last 20 weeks, Monday-first columns)
function heatmapView(states) {
  const WEEKS = 20;
  const now = Game.today();
  const dow = (Game.daysBetween("2024-01-01", now) % 7 + 7) % 7; // 2024-01-01 is a Monday
  const firstMonday = Game.addDays(now, -dow - 7 * (WEEKS - 1));
  const cols = [];
  const months = [];
  let lastMonth = null;
  for (let w = 0; w < WEEKS; w++) {
    const monday = Game.addDays(firstMonday, 7 * w);
    const m = fmtDay(monday, { month: "short" });
    months.push(m !== lastMonth ? m : "");
    lastMonth = m;
    cols.push(h("div", { class: "hm-col" }, [...Array(7)].map((_, i) => {
      const d = Game.addDays(monday, i);
      if (d > now) return h("div", { class: "hm-cell future" });
      const s = states[d];
      return hoverable(h("div", { class: `hm-cell${d === now ? " is-today" : ""}`, style: `background:${s ? VIZ[s.state] : VIZ.empty}` }), dayText(d, s));
    })));
  }
  const total = Object.values(states).filter(s => s.state !== "choked").length;
  return [
    h("div", { class: "hm" },
      h("div", { class: "hm-days muted small" }, ["Mon", "", "Wed", "", "Fri", "", ""].map(t => h("span", {}, t))),
      h("div", {},
        h("div", { class: "hm-months muted small" }, months.map(m => h("span", {}, m))),
        h("div", { class: "hm-grid" }, cols))),
    h("p", { class: "muted small center" }, `${total} day${total === 1 ? "" : "s"} validated since you started`),
    legend(),
  ];
}

// ---- Rating line (last 90 days)
const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}, ...children) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...clean(children));
  return e;
}

function niceMax(v) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v);
}

function ratingView() {
  const hist = state.R.history;
  if (!hist.length) return h("p", { class: "muted center" }, "Play your first card to start your rating curve.");
  const end = Game.today();
  const start = hist[0].day > Game.addDays(end, -89) ? hist[0].day : Game.addDays(end, -89);
  const n = Game.daysBetween(start, end) + 1;
  const days = [...Array(n)].map((_, i) => Game.addDays(start, i));
  const vals = days.map(ratingAt);

  const W = 320, H = 150, L = 40, R = 10, T = 10, B = 22;
  const yMax = niceMax(Math.max(...vals));
  const x = i => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = v => T + (H - T - B) * (1 - v / yMax);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  const cross = svgEl("line", { y1: T, y2: H - B, stroke: "#8d8d93", "stroke-width": 1, visibility: "hidden" });
  const hoverDot = svgEl("circle", { r: 4, fill: VIZ.line, stroke: VIZ.surface, "stroke-width": 2, visibility: "hidden" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": `Rating over the last ${n} days, now ${state.R.st.rating}` },
    [0, 0.5, 1].map(f => [
      svgEl("line", { x1: L, x2: W - R, y1: y(yMax * f), y2: y(yMax * f), stroke: VIZ.grid, "stroke-width": 1 }),
      svgEl("text", { x: L - 6, y: y(yMax * f) + 4, "text-anchor": "end", class: "axis" }, fmtNum(yMax * f)),
    ]),
    svgEl("path", { d: area, fill: VIZ.line, "fill-opacity": 0.08 }),
    svgEl("path", { d: line, fill: "none", stroke: VIZ.line, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }),
    svgEl("circle", { cx: x(n - 1), cy: y(vals[n - 1]), r: 4, fill: VIZ.line, stroke: VIZ.surface, "stroke-width": 2 }),
    svgEl("text", { x: L, y: H - 6, class: "axis" }, fmtDay(start, { day: "numeric", month: "short" })),
    svgEl("text", { x: W - R, y: H - 6, "text-anchor": "end", class: "axis" }, "Today"),
    cross, hoverDot);

  const move = e => {
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
    hoverDot.setAttribute("cx", x(i)); hoverDot.setAttribute("cy", y(vals[i])); hoverDot.setAttribute("visibility", "visible");
    tip.at(box.left + (x(i) / W) * box.width, box.top + (y(vals[i]) / H) * box.height,
      `${fmtDay(days[i], { day: "numeric", month: "short" })} · ${fmtNum(vals[i])}`);
  };
  const leave = () => { cross.setAttribute("visibility", "hidden"); hoverDot.setAttribute("visibility", "hidden"); tip.hide(); };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerleave", leave);

  return [h("p", { class: "muted small" }, "Rating"), svg];
}

// ---- Stats
function statsView() {
  const a = state.attempts.filter(x => x.result);
  const count = r => a.filter(x => x.result === r).length;
  const done = count("rejected") + count("accepted");
  const pct = (x, y) => (y ? `${Math.round((100 * x) / y)}%` : "—");
  const since = Game.addDays(Game.today(), -13);
  const recent = a.filter(x => x.day >= since);
  const avgDiff = recent.length ? (recent.reduce((s, x) => s + x.difficulty, 0) / recent.length).toFixed(1) : "—";
  const times = a.filter(x => Game.isDone(x) && x.resolved_at)
    .map(x => (new Date(x.resolved_at) - new Date(x.created_at)) / 60000).sort((p, q) => p - q);
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  const fmtMin = m => (m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);

  const rows = [
    ["Cards played", a.length],
    ["Rejected · Yes · Choked", `${count("rejected")} · ${count("accepted")} · ${count("choked")}`],
    ["Went for it", pct(done, a.length)],
    ["Rejection rate (when you went)", pct(count("rejected"), done)],
    ["Avg difficulty, last 14 days", avgDiff],
    ["Median time from draw to done", median == null ? "—" : fmtMin(median)],
    ["Days validated", Game.validatedDays(state.attempts).size],
    ["Best streak", streak().best],
  ];
  return h("ul", { class: "list compact" }, rows.map(([k, v]) => h("li", {}, h("span", {}, k), h("strong", { class: "num" }, String(v)))));
}

