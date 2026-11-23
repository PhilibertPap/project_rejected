// App shell: auth, data loading, tabs
const state = { me: null, data: null, attempts: [], cards: [] };
const SCREENS = ["auth", "pending", "app"];
const TABS = { today: () => renderToday(), cards: () => renderCards(), journal: () => renderJournal(), feed: () => renderFeed() };

const showScreen = id => SCREENS.forEach(s => (el(s).hidden = s !== id));
const level = () => Game.level(state.attempts, state.data.level);

async function loadData() {
  const [data, attempts, cards] = await Promise.all([
    fetch("data/challenges.json", { cache: "no-store" }).then(r => r.json()),
    q(sb.from("attempts").select("*").eq("user_id", state.me.id).order("created_at")),
    q(sb.from("custom_cards").select("*").eq("user_id", state.me.id).order("created_at")),
  ]);
  Object.assign(state, { data, attempts, cards });
}

function renderStats() {
  el("stats").textContent =
    `Streak ${Game.streak(state.attempts)} · ${Game.total(state.attempts)} pts · Level ${level().toFixed(1)}`;
}

// Card content for an attempt (from the JSON pack or the user's own cards)
function cardFor(attempt) {
  if (attempt.challenge_id && attempt.challenge_id.startsWith("custom-")) {
    const c = state.cards.find(c => `custom-${c.id}` === attempt.challenge_id);
    return { title: attempt.title, text: c ? c.body : "", difficulty: attempt.difficulty, custom: true };
  }
  const c = [...state.data.scripted, ...state.data.pool].find(c => c.id === attempt.challenge_id);
  return c || { title: attempt.title, text: "", difficulty: attempt.difficulty };
}

function route() {
  const tab = TABS[location.hash.slice(1)] ? location.hash.slice(1) : "today";
  for (const t of Object.keys(TABS)) {
    el(`view-${t}`).hidden = t !== tab;
    document.querySelector(`nav a[href="#${t}"]`).classList.toggle("active", t === tab);
  }
  renderStats();
  TABS[tab]().catch(err => (el(`view-${tab}`).textContent = errorText(err)));
}

async function render() {
  el("auth-msg").textContent = "";
  try {
    state.me = await getProfile();
    if (!state.me) return showScreen("auth");
    document.querySelectorAll(".js-username").forEach(e => (e.textContent = state.me.username));
    if (!state.me.approved) return showScreen("pending");
    await loadData();
    el("admin-link").hidden = !state.me.is_admin;
    showScreen("app");
    route();
  } catch (err) {
    showScreen("auth");
    el("auth-msg").textContent = errorText(err);
  }
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

document.querySelectorAll(".js-logout").forEach(btn =>
  btn.addEventListener("click", async () => { await sb.auth.signOut(); render(); }));

window.addEventListener("hashchange", () => { if (!el("app").hidden) route(); });
render();
