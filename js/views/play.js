// Play: optional situation cards. One big Draw; optional chips to fine-tune.
const playOpts = { place: "any", duo: false, crush: false, tone: "serious" };
const PLACES = ["any", "class", "library", "cafe", "street", "shop", "transport", "party", "gym", "home"];
let rerollUsed = false;

function chip(label, active, onclick, attrs = {}) {
  return h("button", { class: `chip${active ? " active" : ""}`, "aria-pressed": String(active), onclick, ...attrs }, label);
}

// Settings for the next draw: place (one), mode (Progress / Fun), two on/off options
function playChips() {
  const set = (k, v) => () => { playOpts[k] = v; renderPlay(); };
  const toggle = (k, label, sub) => {
    const input = h("input", { type: "checkbox", checked: playOpts[k], onchange: e => { playOpts[k] = e.target.checked; renderPlay(); } });
    return h("label", { class: "switch opt" }, input, h("span", { class: "slider" }),
      h("span", {}, h("b", {}, label), h("small", {}, sub)));
  };
  return h("div", { class: "play-chips" },
    h("p", { class: "opt-label" }, "Where are you?"),
    h("div", { class: "chip-row scroll" }, PLACES.map(p => chip(p === "any" ? "Anywhere" : PLACE_LABEL[p], playOpts.place === p, set("place", p)))),
    h("p", { class: "opt-label" }, "Mode"),
    h("div", { class: "segmented", role: "radiogroup" },
      [["serious", "Progress", "Real asks that make you better"], ["fun", "Fun", "Weird, absurd, harmless"]].map(([v, label, sub]) =>
        h("button", { class: playOpts.tone === v ? "active" : "", role: "radio", "aria-checked": String(playOpts.tone === v), onclick: set("tone", v) },
          h("b", {}, label), h("small", {}, sub)))),
    h("div", { class: "opts" },
      toggle("duo", "With a friend", "Cards for two: you both do it"),
      toggle("crush", "Flirt", "Cards about someone you find attractive")));
}

async function drawPlayCard(exclude = null) {
  const card = Game.drawSituation(state.cards, state.attempts, state.R, state.data, { ...playOpts, exclude });
  if (!card) { alert("No card for these settings yet. Try another place."); return null; }
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
            await drawPlayCard(pending.challenge_id);
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
    hint("play"),
    main,
    h("p", { class: "muted small center" }, note),
    resultList(todays));
}
