// Shared bits used by several views
const RESULT_LABEL = { rejected: "Rejected", accepted: "Yes", choked: "Choked" };

const dots = n => h("span", { class: "dots", title: `Difficulty ${n}` }, "●".repeat(n) + "○".repeat(5 - n));

// Only the card of the day, then "…" if more cards were played
function dailySummary(dayAttempts) {
  const { card, more } = Game.dailyCard(dayAttempts);
  if (!card) return h("p", { class: "muted" }, "No card played.");
  return h("p", { class: "daily" },
    h("span", {}, card.title),
    h("span", { class: `muted res-${card.result}` }, ` · ${RESULT_LABEL[card.result]}`),
    h("span", { class: "muted small" }, ` · ${"●".repeat(card.difficulty)}`),
    more ? h("span", { class: "muted", title: "More cards played that day" }, " …") : null);
}

const tag = isPublic => h("span", { class: `tag${isPublic ? " tag-public" : ""}` }, isPublic ? "public" : "private");
