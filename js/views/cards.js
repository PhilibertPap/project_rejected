// My cards: user-written challenges, playable after the daily card
async function renderCards() {
  const suggested = Math.round(Game.comfort(state.R.st, state.data));
  const form = h("form", { class: "stack" },
    h("label", {}, "Title", h("input", { name: "title", required: true, maxlength: 80 })),
    h("label", {}, "Challenge", h("textarea", { name: "body", rows: 3, maxlength: 500 })),
    h("label", {}, `Difficulty (suggested for you: ${suggested})`,
      h("select", { name: "difficulty" }, [1, 2, 3, 4, 5].map(n =>
        h("option", { value: n, selected: n === suggested }, String(n))))),
    h("button", { type: "submit" }, "Add card"));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(form);
    const row = await q(sb.from("custom_cards").insert({
      title: f.get("title").trim(), body: f.get("body").trim(), difficulty: Number(f.get("difficulty")),
    }).select().single());
    state.cards.push(row);
    renderCards();
  });

  const list = state.cards.length
    ? h("ul", { class: "list" }, state.cards.map(c => h("li", {},
        h("span", {}, h("strong", {}, c.title), " ", h("span", { class: "muted" }, `· ${c.difficulty}`),
          c.body ? h("br") : null, c.body ? h("span", { class: "muted" }, c.body) : null),
        h("button", {
          class: "secondary small",
          onclick: async () => {
            await q(sb.from("custom_cards").delete().eq("id", c.id));
            state.cards = state.cards.filter(x => x.id !== c.id);
            renderCards();
          },
        }, "Delete"))))
    : h("p", { class: "muted" }, "No cards yet.");

  mount(el("view-cards"), form, h("h3", {}, "My cards"), list);
}
