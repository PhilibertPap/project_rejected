// Today: draw a face-down card, flip it, resolve it
const FLIP_MS = 600;
const RESULTS = [
  { key: "rejected", label: "Rejected", cls: "btn-rejected" },
  { key: "accepted", label: "They said yes", cls: "secondary" },
  { key: "choked", label: "Choked", cls: "secondary btn-choked" },
];

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
}

function statusLine(todays) {
  const resolved = todays.filter(a => a.result).sort(Game.byTime);
  const last = resolved[resolved.length - 1];
  return [
    Game.validatedToday(state.attempts)
      ? h("p", { class: "status ok" }, `Day validated. Streak ${Game.streak(state.attempts)}.`)
      : h("p", { class: "status" }, resolved.length ? "Day not validated yet — draw another card." : "Today's card is waiting."),
    last && last.result === "choked"
      ? h("p", { class: "muted center" }, "Choked. That card goes back in the deck for later.")
      : null,
  ];
}

function faceDown(label) {
  let busy = false;
  const card = cardEl(null, false);
  card.classList.add("clickable");
  card.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      const picked = Game.draw(state.data, state.attempts);
      await createAttempt(picked, picked.id);
      card.querySelector(".card-front").replaceWith(cardFront(picked));
      card.classList.add("is-up");
      await wait(FLIP_MS);
      renderToday();
    } catch (err) { busy = false; alert(errorText(err)); }
  });
  return [card, h("p", { class: "muted center" }, label)];
}

function faceUp(attempt) {
  const card = cardEl(cardFront(cardFor(attempt)), true);
  const buttons = RESULTS.map(r =>
    h("button", {
      class: r.cls,
      onclick: async e => {
        e.currentTarget.parentElement.querySelectorAll("button").forEach(b => (b.disabled = true));
        await resolveAttempt(attempt, r.key);
        renderStats();
        card.classList.remove("is-up");
        await wait(FLIP_MS);
        renderToday();
      },
    }, r.label, h("small", {}, ` ${fmtPts(Game.pointsFor(r.key, attempt.difficulty))}`)));
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
    h("li", {}, h("span", {}, a.title), h("span", { class: `muted res-${a.result}` }, `${RESULT_LABEL[a.result]} ${fmtPts(Game.points(a))}`))));
}

async function renderToday() {
  const todays = state.attempts.filter(a => a.day === Game.today());
  const pending = todays.find(a => !a.result);
  const label = Game.validatedToday(state.attempts) ? "Tap to draw another card (optional)"
    : todays.length ? "Tap to draw another card" : "Tap to draw today's card";
  mount(el("view-today"),
    statusLine(todays),
    pending ? faceUp(pending) : faceDown(label),
    !pending && todays.length ? customPicker() : null,
    todayHistory(todays));
}
