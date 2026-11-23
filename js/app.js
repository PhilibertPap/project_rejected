// App shell: auth, data loading, routing by role
const state = { me: null, data: null, attempts: [], cards: [] };
const SCREENS = ["auth", "pending", "app"];
const RENDER = {
  today: () => renderToday(), cards: () => renderCards(), journal: () => renderJournal(),
  feed: () => renderFeed(), settings: () => renderSettings(), admin: () => renderAdmin(),
};
const PLAYER_TABS = ["today", "cards", "journal", "feed", "settings"];
const ADMIN_TABS = ["admin", "settings"];

const showScreen = id => SCREENS.forEach(s => (el(s).hidden = s !== id));

async function loadData() {
  state.data = await fetch("data/challenges.json", { cache: "no-store" }).then(r => r.json());
  if (state.me.is_admin) return;
  [state.attempts, state.cards] = await Promise.all([
    q(sb.from("attempts").select("*").eq("user_id", state.me.id).order("created_at")),
    q(sb.from("custom_cards").select("*").eq("user_id", state.me.id).order("created_at")),
  ]);
  refreshRating();
}

// Compact line on the other tabs (Today has the stat tiles)
function renderStats(tab) {
  el("stats").hidden = state.me.is_admin || tab === "today";
  if (state.me.is_admin) return;
  el("stats").textContent = `Rating ${fmtNum(state.R.st.rating)} · Streak ${Game.streak(state.attempts)}`;
}

// Card content for an attempt (JSON pack or the user's own cards)
function cardFor(attempt) {
  if (attempt.challenge_id && attempt.challenge_id.startsWith("custom-")) {
    const c = state.cards.find(c => `custom-${c.id}` === attempt.challenge_id);
    return { title: attempt.title, text: c ? c.body : "", difficulty: attempt.difficulty, custom: true };
  }
  const c = [...state.data.scripted, ...state.data.pool].find(c => c.id === attempt.challenge_id);
  return c || { title: attempt.title, text: "", difficulty: attempt.difficulty };
}

function route() {
  const tabs = state.me.is_admin ? ADMIN_TABS : PLAYER_TABS;
  const hash = location.hash.slice(1);
  const tab = tabs.includes(hash) ? hash : tabs[0];
  Object.keys(RENDER).forEach(t => (el(`view-${t}`).hidden = t !== tab));
  document.querySelectorAll("nav a, header a").forEach(a =>
    a.classList.toggle("active", a.getAttribute("href") === `#${tab}`));
  renderStats(tab);
  tip.hide();
  RENDER[tab]().catch(err => mount(el(`view-${tab}`), h("p", { class: "msg" }, errorText(err))));
}

async function render() {
  el("auth-msg").textContent = "";
  el("settings-link").hidden = true;
  try {
    state.me = await getProfile();
    if (!state.me) return showScreen("auth");
    document.querySelectorAll(".js-username").forEach(e => (e.textContent = state.me.username));
    if (!state.me.approved) return showScreen("pending");
    await loadData();
    el("player-nav").hidden = state.me.is_admin;
    el("admin-nav").hidden = !state.me.is_admin;
    el("settings-link").hidden = false;
    showScreen("app");
    route();
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

document.querySelectorAll(".js-logout").forEach(btn => btn.addEventListener("click", logout));
window.addEventListener("hashchange", () => { if (!el("app").hidden) route(); });
render();

el("brand").prepend(logoMark());
