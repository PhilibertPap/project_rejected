// Today: the story card of the day (scripted path, Sunday variants, "Not today" swap)
const skipKey = day => `notToday:${state.me.id}:${day}`;
const getSkip = day => { try { return localStorage.getItem(skipKey(day)); } catch (_) { return null; } };
const setSkip = (day, id) => { try { localStorage.setItem(skipKey(day), id); } catch (_) {} };

function storyHeader(S, now) {
  const pct = Math.round((100 * (S.total - S.remaining.length)) / Math.max(1, S.total));
  return h("div", { class: "story-head" },
    h("div", { class: "row between" },
      h("span", { class: "story-day" }, S.finished ? "Season 2" : `Day ${Math.min(S.position, S.total)}`),
      Game.isSunday(now) && !S.finished ? h("span", { class: "tag tag-public" }, "Sunday card")
        : S.finished ? null : h("span", { class: "eyebrow" }, `of ${S.total} · Season 1`)),
    S.finished ? null : h("div", { class: "progress" }, h("i", { style: `width:${pct}%` })));
}

function statusLine(now) {
  const todays = state.attempts.filter(a => a.day === now && a.result);
  if (Game.validatedToday(state.attempts, now)) return h("p", { class: "status ok" }, `Day validated. Streak ${streak().current}.`);
  if (todays.some(a => a.result === "choked" && !Game.isSit(a))) return h("p", { class: "status" }, "Choked. The card is still yours today — try again.");
  return null;
}

function collectedCard(attempt) {
  const d = attempt.difficulty;
  return h("div", { class: "card is-up collected" }, h("div", { class: "card-inner" },
    h("div", { class: `card-face card-front suit-${d}${attempt.result === "rejected" ? " shine" : ""}` },
      corner(d, "tl"),
      h("h2", { class: "center" }, attempt.title),
      h("p", { class: "tip center" }, RESULT_LABEL[attempt.result]),
      corner(d, "br"))));
}

// Season 2 (after day 30): a fresh card every day, drawn around your level
function season2Card() {
  return Game.drawSituation(state.cards, state.attempts, state.R, state.data,
    { place: "any", duo: false, crush: Math.random() < 0.35, tone: "serious" });
}

async function renderToday() {
  const now = Game.today();
  const S = Game.storyState(state.cards, state.attempts, now, getSkip(now));
  const pending = state.attempts.find(a => a.day === now && !a.result && !Game.isSit(a));
  const doneStory = state.attempts.filter(a => a.day === now && !Game.isSit(a) && Game.isDone(a));
  const triedToday = state.attempts.some(a => a.day === now && !Game.isSit(a) && a.result === "choked");

  let main;
  if (pending) {
    const extra = S.canSwap && pending.challenge_id === S.card?.id
      ? h("button", {
          class: "link-btn",
          onclick: async () => { setSkip(now, pending.challenge_id); await deleteAttempt(pending); renderToday(); },
        }, "Not today — swap with the next card of the week")
      : null;
    main = faceUpCard(pending, renderToday, extra);
  } else if (doneStory.length) {
    main = [
      collectedCard(doneStory[0]),
      h("p", { class: "muted center" }, "Today's card is collected. See you tomorrow."),
      h("p", { class: "center" }, h("a", { class: "button-link", href: "#play" }, "Want more? Side quests →")),
    ];
  } else {
    const label = triedToday ? "Tap to try again" : "Tap to reveal today's card";
    main = faceDownCard(label, async () => {
      const card = S.finished ? season2Card() : S.card;
      if (!card) return null;
      await createAttempt(card, "story");
      return card;
    }, renderToday);
  }

  mount(el("view-today"),
    statTiles(),
    storyHeader(S, now),
    statusLine(now),
    main,
    resultList(state.attempts.filter(a => a.day === now && !Game.isSit(a))),
    analyticsTabs());
}
