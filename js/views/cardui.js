// Shared card UI: playing-card faces, flip, resolve buttons, choke message
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
const PLACE_LABEL = { class: "Class", library: "Library", cafe: "Café", street: "Street", shop: "Shop",
                      transport: "Transport", party: "Party", gym: "Gym", home: "Home" };

const corner = (d, pos) => h("div", { class: `corner ${pos}` }, h("b", {}, String(d)), h("span", {}, SUITS[d].symbol));

// Front of a card: index corners, what kind of card it is, tags, the ask, an optional tip,
// a coloured band with a 5-pip difficulty meter
function cardFront(card) {
  const d = card.difficulty;
  const kind = card.mode === "story" ? `Story · day ${card.day}` : card.mode === "sunday" ? "Sunday card"
    : card.place ? PLACE_LABEL[card.place] : "Side quest";
  const tags = [card.duo ? "Duo" : null, card.tone === "fun" ? "Fun" : null, card.crush && card.mode === "situation" ? "Flirt" : null].filter(Boolean);
  const long = (card.body || "").length + (card.tip || "").length > 150;
  return h("div", { class: `card-face card-front suit-${d}${long ? " long" : ""}` },
    cardBand(d, kind),
    corner(d, "tl"),
    h("div", { class: "card-main" },
      tags.length ? h("p", { class: "card-tags" }, tags.map(t => h("span", {}, t))) : null,
      h("h2", {}, card.title),
      card.body ? h("p", {}, card.body) : null,
      card.tip ? h("p", { class: "tip" }, card.tip) : null),
    corner(d, "br"));
}

// Coloured band at the top of the front: kind of card, difficulty pips, a big suit mark
const cardBand = (d, kind) => h("div", { class: "card-band" },
  h("span", { class: "band-mark", "aria-hidden": "true" }, SUITS[d].symbol),
  kind ? h("span", { class: "card-kind" }, kind) : null,
  pips(d));

const pips = d => h("div", { class: "card-pips", title: `Level ${d} of 5` },
  [1, 2, 3, 4, 5].map(i => h("span", { class: i <= d ? "on" : "" }, SUITS[d].symbol)));

function cardEl(front, faceUp) {
  return h("div", { class: `card${faceUp ? " is-up" : ""}` },
    h("div", { class: "card-inner" },
      h("div", { class: "card-face card-back" }, logoMark()),
      front || h("div", { class: "card-face card-front" })));
}

async function createAttempt(card, mode, duo = false) {
  const row = await q(sb.from("attempts").insert({
    day: Game.today(), challenge_id: card.id, title: card.title, difficulty: card.difficulty, mode, duo,
  }).select().single());
  state.attempts.push(row);
  return row;
}

async function deleteAttempt(attempt) {
  await q(sb.from("attempts").delete().eq("id", attempt.id));
  state.attempts = state.attempts.filter(a => a.id !== attempt.id);
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
        h("p", { class: "muted" }, CHOKE_LINES[Math.floor(Math.random() * CHOKE_LINES.length)]),
        h("p", { class: "muted small" }, lost < 0 ? `${fmtPts(lost)} rating · ` : "", "The card goes back in the deck."),
        h("button", { onclick: close }, "Got it")));
    document.body.append(overlay);
    overlay.querySelector("button").focus();
  });
}

// Face-down card: tap (or Enter) to run `onFlip()`, which returns the card to show; then `after()`
function faceDownCard(label, onFlip, after) {
  let busy = false;
  const card = cardEl(null, false);
  card.classList.add("clickable");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  const flip = async () => {
    if (busy) return;
    busy = true;
    try {
      const shown = await onFlip();
      if (!shown) { busy = false; return; }
      card.querySelector(".card-front").replaceWith(cardFront(shown));
      card.classList.add("is-up");
      await wait(FLIP_MS);
      after();
    } catch (err) { busy = false; alert(errorText(err)); }
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  return [card, h("p", { class: "muted center" }, label)];
}

// "You asked N times, X said yes": most people say yes more than you'd think
let allPlayersYes = null;
function yesRate() {
  const asks = state.attempts.filter(Game.isDone);
  const yes = asks.filter(a => a.result === "accepted").length;
  const line = h("p", { class: "yes-rate" });
  const pct = (a, b) => Math.round((100 * a) / b);
  const fill = () => mount(line,
    asks.length ? [h("b", {}, `${pct(yes, asks.length)}% yes`), ` · you asked ${asks.length} time${asks.length === 1 ? "" : "s"}, ${yes} said yes`] : null,
    allPlayersYes && allPlayersYes.asks >= 20
      ? h("span", { class: "muted" }, `${asks.length ? " · " : ""}all players: ${pct(allPlayersYes.yes, allPlayersYes.asks)}% yes`) : null);
  fill();
  if (!allPlayersYes) sb.rpc("yes_rate").then(({ data }) => { if (data && data[0]) { allPlayersYes = data[0]; fill(); } }, () => {});
  return line;
}

// Face-up card with the three result buttons; `extra` = small actions under them (Not today, Reroll)
function faceUpCard(attempt, after, extra = null) {
  const card = cardEl(cardFront(cardFor(attempt)), true);
  const gains = Game.preview(state.R, attempt, state.data);
  const buttons = RESULTS.map(r => h("button", {
    class: r.cls,
    onclick: async e => {
      e.currentTarget.parentElement.querySelectorAll("button").forEach(b => (b.disabled = true));
      const delta = await resolveAttempt(attempt, r.key);
      if (r.key === "choked") await chokeModal(delta);
      card.classList.remove("is-up");
      await wait(FLIP_MS);
      after();
    },
  }, r.label, h("small", {}, ` ${fmtPts(gains[r.key])}`)));
  return [card, h("div", { class: "actions" }, buttons), extra ? h("div", { class: "row center small-actions" }, extra) : null];
}

function resultList(list) {
  const done = list.filter(a => a.result).sort(Game.byTime);
  if (!done.length) return null;
  return h("ul", { class: "list" }, done.map(a =>
    h("li", {}, h("span", {}, suitBadge(a.difficulty), "  ", a.title),
      h("span", { class: `muted res-${a.result}` }, `${RESULT_LABEL[a.result]} ${fmtPts(state.R.deltas[a.id] || 0)}`))));
}
