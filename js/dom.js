// Tiny DOM helpers (no innerHTML with user content)
const el = id => document.getElementById(id);

function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k === "value") e.value = v;
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...children.flat().filter(c => c != null && c !== false));
  return e;
}

const wait = ms => new Promise(r => setTimeout(r, ms));
