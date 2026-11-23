// Today: stat tiles, face-down card, flip, resolve, analytics
const FLIP_MS = 600;
const RESULTS = [
  { key: "rejected", label: "Rejected", cls: "btn-rejected" },
  { key: "accepted", label: "They said yes", cls: "secondary" },
  { key: "choked", label: "Choked", cls: "secondary btn-choked" },
];

const CHOKE_LINES = [
  "The no you're scared of lasts three seconds. The regret lasts all evening.",
  "Nobody out there is keeping score of your awkward moments. Only you are.",
  "You don't need courage for the whole thing. Just for the first five words.",
  "A racing heart means you're at the edge. That's exactly where the game is.",
  "Everyone you'll ask today has been turned down too. Many times.",
  "Choking is data, not a verdict. Try a smaller step.",
  "Walk up before your brain finishes the excuse.",
  "Worst case, they say no. That's literally how you win this game.",
  "The card is still in the deck. So are you.",
  "Ten seconds of awkward buys you a whole day of 'I did it'.",
  "You're not bad at this. You're early.",
  "Pick the next person you see. Don't negotiate with yourself.",
];
const pickLine = () => CHOKE_LINES[Math.floor(Math.random() * CHOKE_LINES.length)];

function cardFront(card) {
  return h("div", { class: "card-face card-front" },
    dots(card.difficulty),
    h("h2", {}, card.title),
    h("p", {}, card.text),
    card.tip ? h("p", { class: "muted" }, card.tip) : null,
    card.custom ? h("p", { class: "muted" }, "Your card") : null);
}

function cardEl(front, faceUp) {
  return h("div", { class: `card${faceUp ? " is-up" : ""}` },
    h("div", { class: "card-inner" },
      h("div", { class: "card-face card-back" }, h("span", { class: "card-mark" }, "?")),
      front || h("div", { class: "card-face card-front" })));
}

async function createAttempt(card, challengeId) {
  const row = await q(sb.from("attempts").insert({
    day: Game.today(), challenge_id: challengeId, title: card.title, difficulty: card.difficulty,
  }).select().single());
  state.attempts.push(row);
  return row;
}

async function resolveAttempt(attempt, result) {
  const row = await q(sb.from("attempts").update({ result }).eq("id", attempt.id).select().single());
  state.attempts[state.attempts.findIndex(a => a.id === row.id)] = row;
  refreshRating();
  return state.R.deltas[row.id] || 0;
}

function chokeModal(lost) {
  return new Promise(resolve => {
    const close = () => { overlay.remove(); resolve(); };
    const overlay = h("div", { class: "overlay", onclick: e => { if (e.target === overlay) close(); } },
      h("div", { class: "modal", role: "dialog", "aria-modal": "true" },
        h("p", { class: "modal-title" }, "Don't give up now."),
        h("p", {}, "You still have the rest of the day to try."),
        h("p", { class: "muted" }, pickLine()),
        h("p", { class: "muted small" }, lost < 0 ? `${fmtPts(lost)} rating · ` : "", "The card goes back in the deck."),
        h("button", { onclick: close }, "Got it")));
    document.body.append(overlay);
    overlay.querySelector("button").focus();
  });
}

function statusLine(todays) {
  const resolved = todays.filter(a => a.result);
  if (Game.validatedToday(state.attempts)) return h("p", { class: "status ok" }, "Day validated.");
  return h("p", { class: "status" }, resolved.length ? "Day not validated yet — draw another card." : "Today's card is waiting.");
}

function faceDown(label) {
  let busy = false;
  const card = cardEl(null, false);
  card.classList.add("clickable");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  const flip = async () => {
    if (busy) return;
    busy = true;
    try {
      const picked = Game.draw(state.data, state.attempts, state.R);
      await createAttempt(picked, picked.id);
      card.querySelector(".card-front").replaceWith(cardFront(picked));
      card.classList.add("is-up");
      await wait(FLIP_MS);
      renderToday();
    } catch (err) { busy = false; alert(errorText(err)); }
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  return [card, h("p", { class: "muted center" }, label)];
}

function faceUp(attempt) {
  const card = cardEl(cardFront(cardFor(attempt)), true);
  const gains = Game.preview(state.R, attempt, state.data);
  const buttons = RESULTS.map(r =>
    h("button", {
      class: r.cls,
      onclick: async e => {
        e.currentTarget.parentElement.querySelectorAll("button").forEach(b => (b.disabled = true));
        const delta = await resolveAttempt(attempt, r.key);
        if (r.key === "choked") await chokeModal(delta);
        card.classList.remove("is-up");
        await wait(FLIP_MS);
        renderToday();
      },
    }, r.label, h("small", {}, ` ${fmtPts(gains[r.key])}`)));
  return [card, h("div", { class: "actions" }, buttons)];
}

function customPicker() {
  if (!state.cards.length) return h("p", { class: "muted center" }, h("a", { href: "#cards" }, "Write your own cards"), " to play them here.");
  const select = h("select", {}, state.cards.map(c => h("option", { value: c.id }, `${c.title} (${c.difficulty})`)));
  return h("div", { class: "row center" }, select,
    h("button", {
      class: "secondary",
      onclick: async () => {
        const c = state.cards.find(c => String(c.id) === select.value);
        await createAttempt(c, `custom-${c.id}`);
        renderToday();
      },
    }, "Play my card"));
}

function todayHistory(todays) {
  const done = todays.filter(a => a.result).sort(Game.byTime);
  if (!done.length) return null;
  return h("ul", { class: "list" }, done.map(a =>
    h("li", {}, h("span", {}, a.title),
      h("span", { class: `muted res-${a.result}` }, `${RESULT_LABEL[a.result]} ${fmtPts(state.R.deltas[a.id] || 0)}`))));
}

async function renderToday() {
  const todays = state.attempts.filter(a => a.day === Game.today());
  const pending = todays.find(a => !a.result);
  const label = Game.validatedToday(state.attempts) ? "Tap to draw another card (optional)"
    : todays.length ? "Tap to draw another card" : "Tap to draw today's card";
  mount(el("view-today"),
    statTiles(),
    statusLine(todays),
    pending ? faceUp(pending) : faceDown(label),
    !pending && todays.length ? customPicker() : null,
    todayHistory(todays),
    analyticsTabs());
}
