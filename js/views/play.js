// Play: optional situation cards. One big Draw; optional chips to fine-tune.
const playOpts = { place: "any", duo: false, crush: false, tone: "serious" };
const PLACES = ["any", "class", "library", "cafe", "street", "shop", "transport", "party", "gym", "home"];
let rerollUsed = false;

const storyDay = () => Game.storyState(state.cards, state.attempts).position;
const crushUnlocked = () => storyDay() >= 15;

function chip(label, active, onclick, attrs = {}) {
  return h("button", { class: `chip${active ? " active" : ""}`, "aria-pressed": String(active), onclick, ...attrs }, label);
}

function playChips() {
  const set = (k, v) => () => { playOpts[k] = v; renderPlay(); };
  return h("div", { class: "play-chips" },
    h("div", { class: "chip-row scroll" }, PLACES.map(p => chip(p === "any" ? "Anywhere" : PLACE_LABEL[p], playOpts.place === p, set("place", p)))),
    h("div", { class: "chip-row" },
      chip("With a friend", playOpts.duo, set("duo", !playOpts.duo)),
      chip("Fun", playOpts.tone === "fun", set("tone", playOpts.tone === "fun" ? "serious" : "fun")),
      crushUnlocked()
        ? chip("Crush", playOpts.crush, set("crush", !playOpts.crush))
        : chip("Crush · day 15", false, null, { disabled: true, title: "Unlocks at day 15 of the story" })));
}

async function drawPlayCard() {
  const card = Game.drawSituation(state.cards, state.attempts, state.R, state.data, playOpts);
  if (!card) { alert("No card for this combination yet."); return null; }
  await createAttempt(card, "situation", playOpts.duo);
  return card;
}

async function renderPlay() {
  const now = Game.today();
  const todays = state.attempts.filter(a => a.day === now && Game.isSit(a));
  const pending = todays.find(a => !a.result);
  const doneCount = todays.filter(Game.isDone).length;
  const note = doneCount >= state.data.scoring.situation_daily.length - 1
    ? "Points are maxed for today — cards still go in your deck."
    : `Side quests: ${doneCount} done today${doneCount === 1 ? " · one more validates the day" : ""}.`;

  let main;
  if (pending) {
    const reroll = !rerollUsed
      ? h("button", {
          class: "link-btn",
          onclick: async () => {
            rerollUsed = true;
            await deleteAttempt(pending);
            await drawPlayCard();
            renderPlay();
          },
        }, "Reroll (once)")
      : null;
    main = faceUpCard(pending, () => { rerollUsed = false; refreshRating(); renderPlay(); }, reroll);
  } else {
    main = [
      ...faceDownCard("Tap to draw", drawPlayCard, renderPlay),
      playChips(),
    ];
  }

  mount(el("view-play"),
    pageHead("Side quests", "Optional cards for wherever you are."),
    main,
    h("p", { class: "muted small center" }, note),
    resultList(todays));
}
