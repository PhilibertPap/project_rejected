// My cards: write your own challenges, shown as a small deck
async function renderCards() {
  const suggested = Math.round(Game.comfort(state.R.st, state.data));
  let level = suggested;

  const picker = h("div", { class: "level-picker", role: "radiogroup", "aria-label": "Difficulty" });
  const drawPicker = () => mount(picker, [1, 2, 3, 4, 5].map(n =>
    h("button", {
      type: "button", role: "radio", "aria-checked": String(n === level),
      class: `level suit-${n}${n === level ? " active" : ""}`, title: `Level ${n} · ${SUITS[n].name}`,
      onclick: () => { level = n; drawPicker(); },
    }, h("span", { class: "suit-mark" }, SUITS[n].symbol), h("b", {}, String(n)))));
  drawPicker();

  const title = h("input", { name: "title", required: true, maxlength: 80, placeholder: "Title — e.g. Ask for the wifi password" });
  const body = h("textarea", { name: "body", rows: 3, maxlength: 500, placeholder: "The challenge, in one or two sentences" });
  const form = h("form", { class: "composer" },
    h("span", { class: "eyebrow" }, "New card"),
    title, body,
    h("div", { class: "composer-foot" },
      h("div", {}, h("span", { class: "muted small block" }, `Difficulty · suggested ${suggested}`), picker),
      h("button", { type: "submit" }, "Add")));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const row = await q(sb.from("custom_cards").insert({
      title: title.value.trim(), body: body.value.trim(), difficulty: level,
    }).select().single());
    state.cards.push(row);
    renderCards();
  });

  const deck = state.cards.length
    ? h("div", { class: "my-deck" }, state.cards.map(c => h("article", { class: `mini-card suit-${c.difficulty}` },
        h("div", { class: "corner tl" }, h("b", {}, String(c.difficulty)), h("span", {}, SUITS[c.difficulty].symbol)),
        h("button", {
          class: "icon-btn", "aria-label": `Delete ${c.title}`, title: "Delete",
          onclick: async () => {
            if (!confirm(`Delete "${c.title}"?`)) return;
            await q(sb.from("custom_cards").delete().eq("id", c.id));
            state.cards = state.cards.filter(x => x.id !== c.id);
            renderCards();
          },
        }, "×"),
        h("h2", {}, c.title),
        c.body ? h("p", {}, c.body) : null)))
    : h("p", { class: "muted center empty-state" }, "No cards yet. Your cards can be played after the daily card, and don't count in your collection.");

  mount(el("view-cards"), form, state.cards.length ? h("h3", {}, `Your deck · ${state.cards.length}`) : null, deck);
}
