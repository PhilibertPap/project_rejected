// Admin: overview charts, pending accounts, players list (each row expands into a full profile)
const openUsers = new Set();
let adminFilter = "";

async function renderAdmin() {
  const [users, stats, attempts, cards] = await Promise.all([
    q(sb.rpc("admin_users")),
    q(sb.rpc("admin_user_stats")),
    q(sb.from("attempts").select("id, user_id, day, title, challenge_id, difficulty, result, mode, duo, created_at, resolved_at").order("created_at")),
    q(sb.from("custom_cards").select("user_id, title, difficulty")),
  ]);
  const now = Game.today();
  const pending = users.filter(u => !u.approved);
  const players = users.filter(u => u.approved);
  const byUser = id => attempts.filter(a => a.user_id === id);
  const seenToday = players.filter(u => u.last_seen_at && Game.today() === localDay(u.last_seen_at)).length;
  const playedToday = new Set(attempts.filter(a => a.day === now).map(a => a.user_id)).size;

  // Players sorted by last activity
  const lastActive = u => [u.last_seen_at, u.last_sign_in_at, ...byUser(u.id).map(a => a.created_at)].filter(Boolean).sort().pop() || "";
  players.sort((a, b) => lastActive(b).localeCompare(lastActive(a)));

  const search = h("input", { type: "search", placeholder: "Search a player…", value: adminFilter });
  const list = h("div", { class: "user-list" });
  const drawList = () => mount(list, players
    .filter(u => u.username.includes(adminFilter.toLowerCase()))
    .map(u => userRow(u, byUser(u.id), stats.find(s => s.user_id === u.id) || {}, cards.filter(c => c.user_id === u.id), lastActive(u))));
  search.addEventListener("input", () => { adminFilter = search.value.trim(); drawList(); });
  drawList();

  mount(el("view-admin"),
    h("div", { class: "tiles tiles-4" },
      adminTile("Players", players.length),
      adminTile("Seen today", seenToday),
      adminTile("Played today", playedToday),
      adminTile("Pending", pending.length)),
    h("section", { class: "panel" }, h("h3", {}, "Active players · last 30 days"), activeChart(attempts)),
    h("section", { class: "panel" }, h("h3", {}, "Results · last 30 days"), resultsBar(attempts)),
    h("section", { class: "panel" }, h("h3", {}, "Cards played by difficulty"), difficultyChart(attempts)),
    pending.length ? h("section", { class: "panel" }, h("h3", {}, `Pending (${pending.length})`), pending.map(pendingRow)) : null,
    h("h3", {}, `Players (${players.length})`),
    search,
    list);
}

const localDay = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const adminTile = (label, value) => h("div", { class: "tile" }, h("span", { class: "tile-label" }, label), h("span", { class: "tile-value" }, String(value)));
const ago = iso => (iso ? fmtAgo(iso) : "never");

function adminAction(label, cls, fn) {
  return h("button", {
    class: `small ${cls}`,
    onclick: async e => {
      e.stopPropagation();
      e.currentTarget.disabled = true;
      try { await fn(); renderAdmin(); }
      catch (err) { if (err.message !== "Cancelled") alert(errorText(err)); e.currentTarget.disabled = false; }
    },
  }, label);
}

function pendingRow(u) {
  return h("div", { class: "pending-row" },
    avatar(u.username),
    h("div", { class: "grow" }, h("strong", {}, u.username), h("div", { class: "muted small" }, `signed up ${ago(u.created_at)}`)),
    adminAction("Approve", "", () => q(sb.rpc("approve_user", { target: u.id }))),
    adminAction("Refuse", "secondary", async () => {
      if (!confirm(`Refuse and delete the account "${u.username}"?`)) throw new Error("Cancelled");
      await q(sb.rpc("reject_user", { target: u.id }));
    }));
}

// ---- one player: compact row + expandable profile
function userRow(u, mine, st, cards, lastActive) {
  const R = Game.replay(mine, state.data);
  const today = lastActive && localDay(lastActive) === Game.today();
  const open = openUsers.has(u.id);
  const details = h("div", { class: "user-details", hidden: !open });
  if (open) mount(details, userDetails(u, mine, st, cards, R));
  const row = h("button", {
    class: "user-row", "aria-expanded": open ? "true" : "false",
    onclick: () => {
      const willOpen = details.hidden;
      details.hidden = !willOpen;
      row.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) { openUsers.add(u.id); mount(details, userDetails(u, mine, st, cards, R)); }
      else openUsers.delete(u.id);
    },
  },
    h("span", { class: "avatar-wrap" }, avatar(u.username), today ? h("span", { class: "online", title: "Active today" }) : null),
    h("span", { class: "grow left" }, h("strong", {}, u.username), h("span", { class: "muted small block" }, `active ${ago(lastActive)}`)),
    h("span", { class: "row-stat" }, h("b", {}, fmtNum(R.st.rating)), h("small", {}, "rating")),
    h("span", { class: "row-stat" }, h("b", {}, String(streak(mine).current)), h("small", {}, "streak")),
    h("span", { class: "chevron", "aria-hidden": "true" }, "›"));
  return h("div", { class: "user" }, row, details);
}

function kv(rows) {
  return h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", {}, k), h("dd", { class: "num" }, String(v))]));
}

function userDetails(u, mine, st, cards, R) {
  const res = mine.filter(a => a.result);
  const c = r => res.filter(a => a.result === r).length;
  const done = c("rejected") + c("accepted");
  const pct = (x, y) => (y ? `${Math.round((100 * x) / y)}%` : "—");
  const recent = res.filter(a => a.day >= Game.addDays(Game.today(), -13));
  const times = res.filter(a => Game.isDone(a) && a.resolved_at).map(a => (new Date(a.resolved_at) - new Date(a.created_at)) / 60000).sort((p, q2) => p - q2);
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  const fmtMin = m => (m == null ? "—" : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);
  const fmtDate = iso => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

  return [
    h("div", { class: "detail-grid" },
      h("section", {}, h("h4", {}, "Account"), kv([
        ["Signed up", fmtDate(u.created_at)],
        ["Last login", fmtDate(u.last_sign_in_at)],
        ["Last seen", fmtDate(u.last_seen_at)],
        ["Entries shared by default", u.is_public ? "yes" : "no"],
        ["Tutorial done", u.onboarded ? "yes" : "no"],
      ])),
      h("section", {}, h("h4", {}, "Game"), kv([
        ["Rating", fmtNum(R.st.rating)],
        ["Streak · best · freezes", `${streak(mine).current} · ${streak(mine).best} · ${streak(mine).freezes}`],
        ["Days validated", Game.validatedDays(mine).size],
        ["Cards played", res.length],
        ["Rejected · Yes · Choked", `${c("rejected")} · ${c("accepted")} · ${c("choked")}`],
        ["Went for it", pct(done, res.length)],
        ["Rejection rate", pct(c("rejected"), done)],
        ["Avg difficulty (14 d)", recent.length ? (recent.reduce((s, a) => s + a.difficulty, 0) / recent.length).toFixed(1) : "—"],
        ["Median draw → done", fmtMin(median)],
      ])),
      h("section", {}, h("h4", {}, "Hidden skill"), kv([
        ["Comfort level", Game.comfort(R.st, state.data).toFixed(2)],
        ["θ (skill)", Math.round(R.st.theta)],
        ["u (uncertainty)", Math.round(R.st.u)],
      ])),
      h("section", {}, h("h4", {}, "Journal & social"), kv([
        ["Entries shared · private", `${st.entries_public ?? 0} · ${st.entries_private ?? 0}`],
        ["Last entry", st.last_entry_at ? fmtAgo(st.last_entry_at) : "—"],
        ["Reactions given · received", `${st.reactions_given ?? 0} · ${st.reactions_received ?? 0}`],
        ["Replies given · received", `${st.replies_given ?? 0} · ${st.replies_received ?? 0}`],
        ["Own cards", cards.length],
      ]))),
    h("h4", {}, "Last 5 weeks"),
    miniHeatmap(mine),
    h("h4", {}, "Recent cards"),
    res.length
      ? h("div", {}, [...res].reverse().slice(0, 6).map(a => h("div", { class: "chip" },
          h("span", { class: `chip-corner suit-${a.difficulty}` }, h("b", {}, String(a.difficulty)), h("span", { class: "suit-mark" }, SUITS[a.difficulty].symbol)),
          h("span", { class: "chip-title" }, a.title),
          h("span", { class: "muted small" }, fmtDay(a.day, { day: "numeric", month: "short" })),
          h("span", { class: `badge badge-${a.result}` }, RESULT_LABEL[a.result]))))
      : h("p", { class: "muted small" }, "No card played yet."),
    cards.length ? [h("h4", {}, "Own cards"), h("p", { class: "muted small" }, cards.map(c2 => `${SUITS[c2.difficulty].symbol} ${c2.title}`).join(" · "))] : null,
    storyTool(u, mine),
    h("div", { class: "danger-zone" },
      adminAction("Delete user", "danger", async () => {
        const typed = prompt(`Delete "${u.username}" and ALL their data (cards, journal, replies, reactions)? Type the username to confirm.`);
        if (typed !== u.username) throw new Error("Cancelled");
        await q(sb.rpc("reject_user", { target: u.id }));
        openUsers.delete(u.id);
      })),
  ];
}

function miniHeatmap(mine) {
  const byDay = {};
  for (const a of mine.filter(a => a.result)) (byDay[a.day] = byDay[a.day] || []).push(a);
  const days = [...Array(35)].map((_, i) => Game.addDays(Game.today(), i - 34));
  return h("div", { class: "mini-hm" }, days.map(d => {
    const list = byDay[d];
    const s = !list ? null : list.some(a => a.result === "rejected") ? "rejected" : list.some(a => a.result === "accepted") ? "accepted" : "choked";
    return hoverable(h("div", { class: "hm-cell", style: `background:${s ? VIZ[s] : VIZ.empty}` }),
      `${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })} · ${s ? STATE_LABEL[s] : "No card"}`);
  }));
}

// ---- charts
function barChart({ values, colors, labels, tips, ariaLabel }) {
  const n = values.length, W = 320, H = 130, L = 26, R = 4, T = 8, B = 18;
  const max = niceMax(Math.max(2, ...values));
  const step = (W - L - R) / n, bw = Math.max(3, Math.min(24, step - 2));
  const y = v => T + (H - T - B) * (1 - v / max);
  const base = y(0);
  const bar = (x, top) => {
    const r = Math.min(4, (base - top) / 2, bw / 2);
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`;
  };
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": ariaLabel },
    [0, 0.5, 1].map(f => [
      svgEl("line", { x1: L, x2: W - R, y1: y(max * f), y2: y(max * f), stroke: VIZ.grid, "stroke-width": 1 }),
      svgEl("text", { x: L - 5, y: y(max * f) + 3.5, "text-anchor": "end", class: "axis" }, fmtNum(max * f)),
    ]),
    values.map((v, i) => {
      const x = L + i * step + (step - bw) / 2;
      return v > 0 ? svgEl("path", { d: bar(x, y(v)), fill: colors[i] }) : null;
    }),
    labels.map((t, i) => t ? svgEl("text", { x: i === n - 1 ? W - R : L + i * step + step / 2, y: H - 4, "text-anchor": i === n - 1 ? "end" : "middle", class: "axis" }, t) : null));
  // hit areas bigger than the marks
  values.forEach((v, i) => {
    const hit = svgEl("rect", { x: L + i * step, y: T, width: step, height: H - T - B, fill: "transparent", tabindex: 0, "aria-label": tips[i] });
    const show = () => { const b = hit.getBoundingClientRect(); tip.at(b.left + b.width / 2, Math.min(b.bottom, b.top + (y(v) / H) * svg.getBoundingClientRect().height), tips[i]); };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", tip.hide);
    hit.addEventListener("blur", tip.hide);
    svg.append(hit);
  });
  return svg;
}

function activeChart(attempts) {
  const days = [...Array(30)].map((_, i) => Game.addDays(Game.today(), i - 29));
  const values = days.map(d => new Set(attempts.filter(a => a.day === d).map(a => a.user_id)).size);
  return barChart({
    values, colors: values.map(() => VIZ.accepted),
    labels: days.map((d, i) => (i % 7 === 2 || i === 29 ? fmtDay(d, { day: "numeric", month: "short" }) : "")),
    tips: days.map((d, i) => `${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })} · ${values[i]} player${values[i] === 1 ? "" : "s"}`),
    ariaLabel: "Active players per day over the last 30 days",
  });
}

function difficultyChart(attempts) {
  const res = attempts.filter(a => a.result && !(a.challenge_id || "").startsWith("custom-"));
  const values = [1, 2, 3, 4, 5].map(d => res.filter(a => a.difficulty === d).length);
  const css = getComputedStyle(document.documentElement);
  return barChart({
    values, colors: [1, 2, 3, 4, 5].map(d => css.getPropertyValue(`--suit-${d}`).trim()),
    labels: [1, 2, 3, 4, 5].map(d => `${SUITS[d].symbol} ${d}`),
    tips: values.map((v, i) => `Level ${i + 1} · ${SUITS[i + 1].name} · ${v} card${v === 1 ? "" : "s"}`),
    ariaLabel: "Cards played by difficulty (own cards excluded)",
  });
}

function resultsBar(attempts) {
  const since = Game.addDays(Game.today(), -29);
  const res = attempts.filter(a => a.result && a.day >= since);
  if (!res.length) return h("p", { class: "muted small" }, "No cards played in the last 30 days.");
  const parts = [["rejected", "Rejected", VIZ["ink-rejected"]], ["accepted", "Yes", VIZ["ink-accepted"]], ["choked", "Choked", VIZ["ink-choked"]]]
    .map(([k, label, ink]) => ({ k, label, ink, n: res.filter(a => a.result === k).length }));
  return [
    h("div", { class: "segbar" }, parts.filter(p => p.n).map(p => {
      const share = Math.round((100 * p.n) / res.length);
      return hoverable(h("div", { class: "seg", style: `flex:${p.n};background:${VIZ[p.k]};color:${p.ink}` }, share >= 12 ? `${share}%` : ""),
        `${p.label} · ${p.n} (${share}%)`);
    })),
    h("div", { class: "legend" }, parts.map(p => h("span", {}, h("i", { class: "swatch", style: `background:${VIZ[p.k]}` }), `${p.label} ${p.n}`))),
  ];
}

// Story progress: set this player's result on each story card (date + result), e.g. to migrate progress
function storyTool(u, mine) {
  const story = state.cards.filter(c => c.mode === "story").sort((a, b) => a.day - b.day);
  const best = id => {
    const list = mine.filter(a => a.challenge_id === id && a.result);
    return list.find(a => a.result === "rejected") || list.find(a => a.result === "accepted") || list[0] || null;
  };
  const S = Game.storyState(state.cards, mine);
  const rows = story.map(c => {
    const cur = best(c.id);
    const sel = h("select", {}, [["", "—"], ["rejected", "Rejected"], ["accepted", "Yes"], ["choked", "Choked"]]
      .map(([k, v]) => h("option", { value: k, selected: (cur?.result || "") === k }, v)));
    const date = h("input", { type: "date", value: cur?.day || Game.today() });
    const status = h("span", { class: "muted small" });
    const save = h("button", {
      class: "small secondary", type: "button",
      onclick: async () => {
        save.disabled = true;
        try {
          await q(sb.rpc("admin_set_story", { target: u.id, card: c.id, res: sel.value || null, d: date.value }));
          status.textContent = "saved";
        } catch (err) { status.textContent = errorText(err); }
        save.disabled = false;
      },
    }, "Save");
    return h("div", { class: "story-row" }, h("span", { class: "story-day" }, String(c.day)), h("span", { class: "grow left small" }, c.title), sel, date, save, status);
  });
  return h("details", { class: "story-tool" },
    h("summary", {}, `Story progress · day ${Math.min(S.position, S.total)} / ${S.total}`),
    h("p", { class: "muted small" }, "Set a result and a date per card, then Save. Clearing a result (—) removes it. Reload the page to see totals update."),
    rows);
}
