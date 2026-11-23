// Tiny DOM helpers (no innerHTML with user content)
const el = id => document.getElementById(id);
const clean = list => list.flat(Infinity).filter(c => c != null && c !== false);

function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k === "value") e.value = v;
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...clean(children));
  return e;
}

// replaceChildren without "null" text nodes
const mount = (root, ...children) => root.replaceChildren(...clean(children));

const wait = ms => new Promise(r => setTimeout(r, ms));

const fmtPts = p => (p > 0 ? `+${p}` : `${p}`);

function fmtDay(day, opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", opts);
}

const fmtDateTime = iso => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
