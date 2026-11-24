// First login: a 3-step intro (the idea, the card, points). Each other tab explains itself with a
// one-time tip the first time you open it (hint()). Settings > "Replay intro" shows everything again.
const TOUR = [
  { title: "Project Rejected",
    body: ["One small real-life ask a day: the time, a discount, a coffee with a stranger.",
           "It starts very easy and gets harder over 30 days. The goal: asking stops being scary, whatever the answer."] },
  { target: ".card", title: "Today's card",
    body: ["Tap to reveal it. Go do it for real, then come back and say honestly how it went.",
           "Didn't dare? Say so. The card stays until you do it."] },
  { target: ".tiles", title: "Points and streak",
    body: ["Asking earns points. Come back every day to keep your streak.",
           "That's it. The other tabs explain themselves the first time you open them."] },
];

// ---- one-time tips, shown at the top of a tab on the first visit
const HINTS = {
  play: { title: "Side quests", text: "Extra cards, optional. Pick where you are and a mode, then tap the card. Do as many as you want." },
  journal: { title: "Journal", text: "A few lines on how it went: before, during, after. Private unless you tick “Share with team”." },
  team: { title: "Team", text: "Up to 7 friends. You see each other's week and shared journal entries. Invite friends with a link." },
};
const hintKey = page => `hint:${state.me.id}:${page}`;
function hint(page) {
  const tip = HINTS[page];
  try { if (!tip || localStorage.getItem(hintKey(page))) return null; } catch (_) { return null; }
  const box = h("div", { class: "hint-card", role: "note" },
    h("p", { class: "hint-title" }, tip.title),
    h("p", {}, tip.text),
    h("button", { class: "small secondary", onclick: () => { try { localStorage.setItem(hintKey(page), "1"); } catch (_) {} box.remove(); } }, "Got it"));
  return box;
}
function resetHints() { Object.keys(HINTS).forEach(p => { try { localStorage.removeItem(hintKey(p)); } catch (_) {} }); }

function startTutorial() {
  if (location.hash && location.hash !== "#today") { location.hash = "#today"; }
  let i = 0;
  const spot = h("div", { class: "tour-spot" });
  const bubble = h("div", { class: "tour-bubble", role: "dialog", "aria-modal": "true" });
  const root = h("div", { class: "tour" }, spot, bubble);
  document.body.append(root);
  document.body.classList.add("touring");

  const finish = async () => {
    root.remove();
    document.body.classList.remove("touring");
    window.removeEventListener("resize", place);
    document.removeEventListener("keydown", onKey);
    if (!state.me.onboarded) {
      state.me.onboarded = true;
      try { await q(sb.from("profiles").update({ onboarded: true }).eq("id", state.me.id)); } catch (_) {}
    }
  };
  const onKey = e => {
    if (e.key === "Escape") finish();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };
  const go = d => { i = Math.max(0, Math.min(TOUR.length - 1, i + d)); show(); };

  function place() {
    const step = TOUR[i];
    const target = step.target && document.querySelector(step.target);
    root.classList.toggle("no-target", !target);
    if (!target) { bubble.style.left = ""; bubble.style.top = ""; return; }
    const r = target.getBoundingClientRect(), pad = 6;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    const bw = Math.min(320, window.innerWidth - 24), bh = bubble.offsetHeight;
    const below = r.bottom + pad + 12 + bh < window.innerHeight;
    const top = below ? r.bottom + pad + 12 : Math.max(12, r.top - pad - 12 - bh);
    const left = Math.min(window.innerWidth - bw - 12, Math.max(12, r.left + r.width / 2 - bw / 2));
    Object.assign(bubble.style, { left: `${left}px`, top: `${top}px`, width: `${bw}px` });
  }

  function show() {
    const step = TOUR[i];
    const last = i === TOUR.length - 1;
    mount(bubble,
      h("p", { class: "tour-step" }, `${i + 1} / ${TOUR.length}`),
      h("p", { class: "tour-title" }, step.title),
      step.body.map(t => h("p", {}, t)),
      h("div", { class: "tour-foot" },
        h("button", { class: "secondary small", onclick: finish }, "Skip"),
        h("span", { class: "grow" }),
        i ? h("button", { class: "secondary small", onclick: () => go(-1) }, "Back") : null,
        h("button", { class: "small", onclick: () => (last ? finish() : go(1)) }, last ? "Let's go" : "Next")));
    const target = step.target && document.querySelector(step.target);
    if (target) target.scrollIntoView({ block: "center", behavior: "instant" });
    requestAnimationFrame(place);
    bubble.querySelector(".tour-foot button:last-child").focus();
  }

  window.addEventListener("resize", place);
  document.addEventListener("keydown", onKey);
  show();
}
