// Shared bits used by several views
const RESULT_LABEL = { rejected: "Rejected", accepted: "Yes", choked: "Choked" };

// One suit per difficulty: color + symbol (the symbol keeps it readable without color)
const SUITS = {
  1: { name: "Green", symbol: "●" },
  2: { name: "Blue", symbol: "◆" },
  3: { name: "Gold", symbol: "▲" },
  4: { name: "Ruby", symbol: "■" },
  5: { name: "White", symbol: "★" },
};
const suitBadge = n => h("span", { class: `suit suit-${n}`, title: `Level ${n} · ${SUITS[n].name}` },
  h("span", { class: "suit-mark" }, SUITS[n].symbol), ` ${n}`);

// Logo: two stacked cards
function logoMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<rect x="3.5" y="5.5" width="11" height="15" rx="2" transform="rotate(-10 9 13)" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
                  '<rect x="9.5" y="3.5" width="11" height="15" rx="2" fill="#0e0e0f" stroke="currentColor" stroke-width="1.6"/>';
  return svg;
}

// Only the card of the day, then "…" if more cards were played
function dailySummary(dayAttempts) {
  const { card, more } = Game.dailyCard(dayAttempts);
  if (!card) return h("p", { class: "muted" }, "No card played.");
  return h("p", { class: "daily" },
    h("span", {}, card.title),
    h("span", { class: `muted res-${card.result}` }, ` · ${RESULT_LABEL[card.result]}`),
    h("span", { class: "muted small" }, " · "), suitBadge(card.difficulty),
    more ? h("span", { class: "muted", title: "More cards played that day" }, " …") : null);
}

const tag = isPublic => h("span", { class: `tag${isPublic ? " tag-public" : ""}` }, isPublic ? "public" : "private");
