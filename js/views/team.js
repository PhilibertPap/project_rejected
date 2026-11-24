// Team: up to 7 players. Weekly ranking, join requests, invite link, shared journal entries.
// No team yet: create one, or ask to join a public one. Invite links (#join=CODE) are handled in app.js.
const TEAM_MAX = 7;

const weekStart = day => Game.addDays(day, -((new Date(`${day}T12:00`).getDay() + 6) % 7));
const rpcAndRefresh = async (fn, args, btn) => {
  if (btn) btn.disabled = true;
  try { await q(sb.rpc(fn, args)); renderTeam(); }
  catch (err) { if (btn) btn.disabled = false; alert(errorText(err)); }
};

async function renderTeam() {
  const rows = await q(sb.from("team_members").select("team:teams(id, name, is_public, owner_id)").eq("user_id", state.me.id));
  if (!rows.length) return renderNoTeam();
  const team = rows[0].team;
  const [members, requests] = await Promise.all([
    q(sb.from("team_members").select("user_id, joined_at, profile:profiles(username)").eq("team_id", team.id).order("joined_at")),
    q(sb.from("team_requests").select("user_id, profile:profiles(username)").eq("team_id", team.id).order("created_at")),
  ]);
  const attempts = await q(sb.from("attempts").select("*").in("user_id", members.map(m => m.user_id))
    .not("result", "is", null).order("created_at"));
  const owner = team.owner_id === state.me.id;

  mount(el("view-team"),
    h("div", { class: "team-head" },
      h("h2", { class: "team-name" }, team.name),
      h("p", { class: "muted" }, tag(team.is_public), ` ${members.length} of ${TEAM_MAX} players`)),
    members.length < TEAM_MAX ? inviteButton() : null,
    requests.length ? requestList(requests, members.length) : null,
    ranking(members, attempts),
    h("h3", {}, "Shared entries"),
    await feedPosts("Nothing shared yet. Write in your Journal and tick “Share with team”."),
    teamSettings(team, members, owner));
}

// ---- no team
async function renderNoTeam() {
  const teams = await q(sb.rpc("list_teams"));
  const name = h("input", { placeholder: "Team name", maxlength: 30 });
  const pub = h("input", { type: "checkbox", checked: true });
  const create = h("button", {
    onclick: () => {
      if (name.value.trim().length < 2) return name.focus();
      rpcAndRefresh("create_team", { team_name: name.value, public_team: pub.checked }, create);
    },
  }, "Create");

  mount(el("view-team"),
    pageHead("Team", `Play with up to ${TEAM_MAX} friends: a weekly ranking, shared journal entries, cheers.`),
    h("section", { class: "panel" },
      h("h3", {}, "Create a team"),
      h("div", { class: "row" }, name, create),
      h("label", { class: "switch" }, pub, h("span", { class: "slider" }),
        h("span", {}, "Public — anyone can ask to join")),
      h("p", { class: "hint" }, "Private teams are invite-link only. You can change it later.")),
    h("section", { class: "panel" },
      h("h3", {}, "Join a team"),
      h("p", { class: "muted small" }, "Got an invite link? Just open it."),
      teams.length ? teams.map(t => h("div", { class: "team-row" },
        h("div", { class: "grow" }, h("strong", {}, t.name), h("span", { class: "muted small" }, ` · ${t.members}/${TEAM_MAX}`)),
        t.requested
          ? h("button", { class: "secondary small", onclick: ev => rpcAndRefresh("cancel_request", { t: t.id }, ev.currentTarget) }, "Requested · cancel")
          : h("button", { class: "small", onclick: ev => rpcAndRefresh("request_team", { t: t.id }, ev.currentTarget) }, "Ask to join")))
        : h("p", { class: "muted small" }, "No public team with room yet.")));
}

// ---- team parts
function inviteButton() {
  const note = h("span", { class: "muted small" }, "Friends who open the link join directly.");
  const btn = h("button", {
    class: "invite-btn",
    onclick: async () => {
      const code = await q(sb.rpc("my_invite_code"));
      const url = `${location.origin}${location.pathname}#join=${code}`;
      const text = "Join my team on Project Rejected — one small ask a day.";
      try {
        if (navigator.share) await navigator.share({ title: "Project Rejected", text, url });
        else { await navigator.clipboard.writeText(url); note.textContent = "Link copied."; }
      } catch (err) { if (err.name !== "AbortError") prompt("Copy this link:", url); }
    },
  }, "Invite a friend");
  return h("div", { class: "invite" }, btn, note);
}

function requestList(requests, size) {
  return h("section", { class: "callout" },
    h("h3", {}, requests.length === 1 ? "1 player wants to join" : `${requests.length} players want to join`),
    requests.map(r => h("div", { class: "team-row" },
      avatar(r.profile.username),
      h("strong", { class: "grow" }, r.profile.username),
      h("button", { class: "small", disabled: size >= TEAM_MAX,
        onclick: ev => rpcAndRefresh("answer_request", { target: r.user_id, accept: true }, ev.currentTarget) }, "Accept"),
      h("button", { class: "secondary small",
        onclick: ev => rpcAndRefresh("answer_request", { target: r.user_id, accept: false }, ev.currentTarget) }, "Decline"))));
}

// This week's points (Monday → today), then streak and rating
function ranking(members, attempts) {
  const from = weekStart(Game.today());
  const rows = members.map(m => {
    const mine = attempts.filter(a => a.user_id === m.user_id);
    const R = Game.replay(mine, state.data);
    const week = mine.filter(a => a.day >= from).reduce((s, a) => s + (R.deltas[a.id] || 0), 0);
    return { id: m.user_id, name: m.profile.username, week: Math.round(week), rating: R.st.rating,
             streak: Game.streakInfo(mine, state.cards, state.data).current };
  }).sort((a, b) => b.week - a.week || b.rating - a.rating);

  return h("section", { class: "ranking" },
    h("h3", {}, "This week"),
    h("div", { class: "rank-list" }, rows.map((r, i) => h("div", { class: `rank-row${r.id === state.me.id ? " me" : ""}` },
      h("span", { class: "rank-pos" }, String(i + 1)),
      avatar(r.name, r.id === state.me.id),
      h("div", { class: "grow" },
        h("strong", {}, r.name),
        h("span", { class: "muted small rank-sub" }, `Streak ${r.streak} · Rating ${fmtNum(r.rating)}`)),
      h("span", { class: `rank-pts${r.week < 0 ? " neg" : r.week === 0 ? " zero" : ""}` }, fmtPts(r.week))))),
    h("p", { class: "muted small center" }, "Points earned since Monday."));
}

function teamSettings(team, members, owner) {
  const leave = h("button", {
    class: "secondary danger",
    onclick: ev => {
      const last = members.length === 1;
      if (!confirm(last ? "Leave and delete the team? You're the last player." : `Leave ${team.name}?`)) return;
      rpcAndRefresh("leave_team", {}, ev.currentTarget);
    },
  }, "Leave team");
  if (!owner) return h("details", { class: "team-settings" }, h("summary", {}, "Team settings"), leave);

  const name = h("input", { value: team.name, maxlength: 30 });
  const pub = h("input", { type: "checkbox", checked: team.is_public });
  return h("details", { class: "team-settings" },
    h("summary", {}, "Team settings"),
    h("div", { class: "row" }, name,
      h("button", { class: "small", onclick: ev => rpcAndRefresh("update_team", { team_name: name.value, public_team: pub.checked }, ev.currentTarget) }, "Save")),
    h("label", { class: "switch" }, pub, h("span", { class: "slider" }), h("span", {}, "Public — anyone can ask to join")),
    h("div", { class: "small-actions" },
      h("button", { class: "secondary small", onclick: ev => {
        if (confirm("Make a new invite link? The old one stops working.")) rpcAndRefresh("new_invite_code", {}, ev.currentTarget);
      } }, "New invite link")),
    members.filter(m => m.user_id !== state.me.id).map(m => h("div", { class: "team-row" },
      avatar(m.profile.username), h("span", { class: "grow" }, m.profile.username),
      h("button", { class: "secondary small", onclick: ev => {
        if (confirm(`Remove ${m.profile.username} from the team?`)) rpcAndRefresh("remove_member", { target: m.user_id }, ev.currentTarget);
      } }, "Remove"))),
    leave);
}

// ---- invite links: #join=CODE is kept through sign-up and approval, then offered once
const INVITE_KEY = "pendingInvite";

function captureInvite() {
  const m = location.hash.match(/^#join=([a-z0-9]+)/i);
  if (!m) return;
  try { localStorage.setItem(INVITE_KEY, m[1]); } catch {}
  history.replaceState(null, "", location.pathname + location.search + "#team");
}

const pendingInvite = () => { try { return localStorage.getItem(INVITE_KEY); } catch { return null; } };
const clearInvite = () => { try { localStorage.removeItem(INVITE_KEY); } catch {} };

// Banner on the sign-up / waiting screens
async function showInviteBanner() {
  const code = pendingInvite();
  document.querySelectorAll(".js-invite").forEach(e => (e.hidden = true));
  if (!code) return;
  const [t] = await q(sb.rpc("team_by_code", { code })).catch(() => []);
  if (!t) return clearInvite();
  document.querySelectorAll(".js-invite").forEach(e => {
    mount(e, "You're invited to join ", h("strong", {}, t.name), ` (${t.members}/${TEAM_MAX}). `,
      e.dataset.when === "pending" ? "You'll join once your account is approved." : "Create an account to join.");
    e.hidden = false;
  });
}

// After login (approved player): join the invited team
async function acceptInvite() {
  const code = pendingInvite();
  if (!code || state.me.is_admin) return;
  clearInvite();
  try {
    const [t] = await q(sb.rpc("team_by_code", { code }));
    if (!t) return alert("This invite link is not valid anymore.");
    if (!confirm(`Join the team “${t.name}”?`)) return;
    await q(sb.rpc("join_team", { code }));
    if (location.hash === "#team") route(); else location.hash = "#team";
  } catch (err) { alert(errorText(err)); }
}
