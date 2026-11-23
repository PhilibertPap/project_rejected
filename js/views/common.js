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

// Mini playing card for the card of the day, then "+n" if more cards were played
function dailySummary(dayAttempts) {
  const { card, more } = Game.dailyCard(dayAttempts);
  if (!card) return h("div", { class: "chip chip-empty" }, h("span", { class: "muted small" }, "No card played"));
  const d = card.difficulty;
  return h("div", { class: `chip suit-${d}` },
    h("span", { class: "chip-corner" }, h("b", {}, String(d)), h("span", { class: "suit-mark" }, SUITS[d].symbol)),
    h("span", { class: "chip-title" }, card.title),
    h("span", { class: `badge badge-${card.result}` }, RESULT_LABEL[card.result]),
    more ? h("span", { class: "chip-more", title: "More cards played that day" }, "…") : null);
}

// "2h ago", "Yesterday", "12 Nov"
function fmtAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const avatar = (name, mine = false) => h("div", { class: `avatar-sm${mine ? " mine" : ""}`, "aria-hidden": "true" }, name[0].toUpperCase());

const tag = isPublic => h("span", { class: `tag${isPublic ? " tag-public" : ""}` }, isPublic ? "Public" : "Private");
