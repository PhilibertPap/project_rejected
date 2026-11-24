// App shell: auth, data loading, routing by role
const state = { me: null, data: null, attempts: [], cards: [] };  // data = config.json, cards = card catalogue (DB)
const SCREENS = ["auth", "pending", "app"];
const RENDER = {
  today: () => renderToday(), play: () => renderPlay(), deck: () => renderDeck(), journal: () => renderJournal(),
  team: () => renderTeam(), feed: () => renderFeed(), settings: () => renderSettings(), admin: () => renderAdmin(), catalog: () => renderCatalog(),
};
const PLAYER_TABS = ["today", "play", "deck", "journal", "team", "settings"];
const ADMIN_TABS = ["admin", "catalog", "feed", "settings"];

const showScreen = id => SCREENS.forEach(s => (el(s).hidden = s !== id));

async function loadData() {
  [state.data, state.cards] = await Promise.all([
    fetch("data/config.json", { cache: "no-store" }).then(r => r.json()),
    q(sb.from("cards").select("*").order("id")),
  ]);
  if (state.me.is_admin) return;
  state.attempts = await q(sb.from("attempts").select("*").eq("user_id", state.me.id).order("created_at"));
  refreshRating();
}

const streak = (attempts = state.attempts) => Game.streakInfo(attempts, state.cards, state.data);

// Streak and rating in the app bar (Story has the full tiles)
function renderStats(tab) {
  el("stats").hidden = state.me.is_admin || tab === "today";
  if (state.me.is_admin) return;
  const s = streak().current;
  mount(el("stats"),
    h("span", { class: `hud-pill hud-streak${s ? "" : " cold"}`, title: "Streak (days in a row)" }, icon("flame"), String(s)),
    h("span", { class: "hud-pill hud-rating", title: "Rating" }, icon("diamond"), fmtNum(state.R.st.rating)));
}

// Card content for an attempt (catalogue, falling back to what the attempt stored)
function cardFor(attempt) {
  const c = state.cards.find(c => c.id === attempt.challenge_id);
  return c || { title: attempt.title, body: "", difficulty: attempt.difficulty };
}

function route() {
  const tabs = state.me.is_admin ? ADMIN_TABS : PLAYER_TABS;
  const hash = location.hash.slice(1);
  const tab = tabs.includes(hash) ? hash : tabs[0];
  Object.keys(RENDER).forEach(t => (el(`view-${t}`).hidden = t !== tab));
  document.body.dataset.tab = tab;
  document.querySelectorAll("nav a, header a").forEach(a =>
    a.classList.toggle("active", a.getAttribute("href") === `#${tab}`));
  el("profile-btn").classList.toggle("active", tab === "deck" || tab === "settings");
  closeProfile();
  renderStats(tab);
  tip.hide();
  RENDER[tab]().catch(err => mount(el(`view-${tab}`), h("p", { class: "msg" }, errorText(err))));
}

async function render() {
  el("auth-msg").textContent = "";
  el("profile-menu").hidden = true;
  try {
    state.me = await getProfile();
    if (!state.me) { showInviteBanner(); return showScreen("auth"); }
    document.querySelectorAll(".js-username").forEach(e => (e.textContent = state.me.username));
    if (!state.me.approved) { showInviteBanner(); return showScreen("pending"); }
    await loadData();
    el("player-nav").hidden = state.me.is_admin;
    el("admin-nav").hidden = !state.me.is_admin;
    el("profile-menu").hidden = false;
    el("profile-btn").textContent = state.me.username[0].toUpperCase();
    document.querySelectorAll(".js-player-only").forEach(e => (e.hidden = state.me.is_admin));
    showScreen("app");
    route();
    sb.rpc("touch").then(() => {}, () => {});
    await acceptInvite();
    if (!state.me.is_admin && !state.me.onboarded) setTimeout(startTutorial, 400);
  } catch (err) {
    showScreen("auth");
    el("auth-msg").textContent = errorText(err);
  }
}

async function logout() {
  await sb.auth.signOut();
  location.hash = "";
  render();
}

el("auth-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const username = form.get("username").trim().toLowerCase();
  const email = toEmail(username);
  const password = form.get("password");
  const { error } = e.submitter.dataset.action === "signup"
    ? await sb.auth.signUp({ email, password, options: { data: { username } } })
    : await sb.auth.signInWithPassword({ email, password });
  if (error) return (el("auth-msg").textContent = errorText(error));
  e.target.reset();
  render();
});

// Profile menu: avatar top right opens Deck / Settings / Log out; closes on outside click or Esc
function closeProfile() { el("profile-pop").hidden = true; el("profile-btn").setAttribute("aria-expanded", "false"); }
el("profile-btn").addEventListener("click", e => {
  e.stopPropagation();
  const open = el("profile-pop").hidden;
  el("profile-pop").hidden = !open;
  el("profile-btn").setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", e => { if (!el("profile-menu").contains(e.target)) closeProfile(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeProfile(); });
el("profile-pop").addEventListener("click", e => { if (e.target.closest("a")) closeProfile(); });

document.querySelectorAll(".js-logout").forEach(btn => btn.addEventListener("click", logout));
window.addEventListener("hashchange", () => {
  if (/^#join=/.test(location.hash)) { captureInvite(); if (!el("app").hidden) acceptInvite(); else showInviteBanner(); }
  if (!el("app").hidden) route();
});
captureInvite();
render();

el("brand").prepend(logoMark());
el("hero-mark").append(logoMark());
