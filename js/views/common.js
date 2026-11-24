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
                  '<rect x="9.5" y="3.5" width="11" height="15" rx="2" style="fill:var(--bg)" stroke="currentColor" stroke-width="1.6"/>';
  return svg;
}

// Page title at the top of a tab (coloured by the tab accent through h3/buttons below it)
const pageHead = (title, sub) => h("div", { class: "page-head" },
  h("h2", { class: "page-title" }, title), sub ? h("p", { class: "page-sub" }, sub) : null);

// Small line icons (24px grid, stroke = currentColor)
const ICONS = {
  flame: '<path d="M12 3c.8 2.9 4.5 4.6 4.5 9a4.5 4.5 0 0 1-9 0c0-1.8.8-3.1 1.8-4 .2 1.5 1 2.4 2.2 2.4C11.5 7.6 11 5.4 12 3z"/>',
  diamond: '<path d="M12 3.5l6 8.5-6 8.5-6-8.5z"/>',
};
function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("stroke-linecap", "round");
  svg.innerHTML = ICONS[name];
  return svg;
}

// Mini playing card for the card of the day, then "+n" if more cards were played
function dailySummary(dayAttempts) {
  const { card, more } = Game.dailyCard(dayAttempts);
  if (!card) return h("div", { class: "chip-card chip-empty" }, h("span", { class: "muted small" }, "No card played"));
  const d = card.difficulty;
  return h("div", { class: `chip-card suit-${d}` },
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

const tag = (isPublic, on = "Public", off = "Private") => h("span", { class: `tag${isPublic ? " tag-public" : ""}` }, isPublic ? on : off);
