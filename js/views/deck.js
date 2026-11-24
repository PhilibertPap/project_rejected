// Deck: the collection album. A card is collected once done (Rejected or Yes).
async function renderDeck() {
  const col = Game.collection(state.attempts);
  const S = Game.storyState(state.cards, state.attempts);
  const active = state.cards.filter(c => c.active);
  const sets = [
    { name: "Season 1", cards: active.filter(c => c.mode === "story").sort((a, b) => a.day - b.day), story: true },
    { name: "Sundays", cards: active.filter(c => c.mode === "sunday").sort((a, b) => a.week - b.week), story: true },
    ...PLACES.slice(1).map(p => ({ name: PLACE_LABEL[p], cards: active.filter(c => c.mode === "situation" && c.place === p)
      .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title)) })),
  ].filter(s => s.cards.length);

  const total = sets.reduce((n, s) => n + s.cards.length, 0);
  const owned = sets.reduce((n, s) => n + s.cards.filter(c => col[c.id]).length, 0);

  const tile = (c, hideFuture) => {
    const got = col[c.id];
    const hidden = !got && hideFuture && c.mode === "story" && c.day > S.position;
    return h("div", {
      class: `deck-card suit-${c.difficulty}${got ? "" : " locked"}${got && got.rejected ? " shine" : ""}`,
      title: got ? `${c.title} · done ${got.count}×${got.rejected ? " · rejected at least once" : ""}` : hidden ? "Not reached yet" : c.title,
    },
      h("div", { class: "deck-corner" }, h("b", {}, String(c.difficulty)), h("span", { class: "suit-mark" }, SUITS[c.difficulty].symbol)),
      h("span", { class: "deck-title" }, hidden ? "???" : c.title),
      got && got.count > 1 ? h("span", { class: "deck-count" }, `×${got.count}`) : null,
      c.tone === "fun" ? h("span", { class: "deck-flag" }, "Fun") : c.crush && c.mode === "situation" ? h("span", { class: "deck-flag" }, "Crush") : null);
  };

  mount(el("view-deck"),
    h("div", { class: "deck-head" },
      h("p", { class: "tile-value" }, `${owned}`, h("small", {}, ` / ${total}`)),
      h("p", { class: "muted small" }, "cards collected · a white edge = you got a no on it")),
    sets.map(s => h("section", { class: "deck-set" },
      h("h3", {}, s.name, h("span", { class: "muted small" }, `  ${s.cards.filter(c => col[c.id]).length} / ${s.cards.length}`)),
      h("div", { class: "deck-grid" }, s.cards.map(c => tile(c, s.story))))));
}
