// First-run tutorial: the idea, then a spotlight tour of the UI. Skippable at any step.
const TOUR = [
  { title: "Collect no's.",
    body: ["The goal is to hear no — so that asking for things gets easier.",
           "Every day you get one challenge. Either you choke and don't ask anyone, or you take your courage in both hands and ask.",
           "And if they say no, even better. What matters isn't the thing you ask for. It's that you asked."] },
  { target: ".card", title: "Story",
    body: ["One card a day, in order: a small real-life ask. The path is 30 days long and starts very easy."] },
  { target: ".card", title: "Three outcomes", outcomes: true,
    body: ["After you tried, tell the truth:"] },
  { target: ".tiles", title: "Your numbers",
    body: ["Rating goes up every time you ask. Streak counts the days in a row with at least one ask."] },
  { target: ".analytics .tabs", title: "Your progress",
    body: ["Your week, the cards you've collected by colour, a heatmap of every day, your rating curve and your stats."] },
  { target: 'nav a[href="#play"]', title: "Side quests",
    body: ["Optional. Draw extra cards for where you are — class, café, park — alone or with a friend, serious or fun."] },
  { target: 'nav a[href="#journal"]', title: "Journal",
    body: ["Write how it went: before, during, after. Keep it private, or publish one entry a day to the feed."] },
  { target: 'nav a[href="#feed"]', title: "Feed",
    body: ["See how the others are doing. React with 👍 or 💪, and reply."] },
  { target: "#profile-btn", title: "You",
    body: ["Your Deck — every card you've done, with a white edge when you got a no — plus settings, password and this tutorial."] },
];

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
      step.outcomes ? h("div", { class: "tour-outcomes" },
        h("div", {}, h("span", { class: "badge badge-rejected" }, "Rejected"), h("span", {}, "Best outcome. Double points.")),
        h("div", {}, h("span", { class: "badge badge-accepted" }, "Yes"), h("span", {}, "You asked, they agreed. Good.")),
        h("div", {}, h("span", { class: "badge badge-choked" }, "Choked"), h("span", {}, "You didn't ask. You lose a bit, but you still have the rest of the day."))) : null,
      h("div", { class: "tour-foot" },
        h("button", { class: "secondary small", onclick: finish }, "Skip"),
        h("span", { class: "grow" }),
        i ? h("button", { class: "secondary small", onclick: () => go(-1) }, "Back") : null,
        h("button", { class: "small", onclick: () => (last ? finish() : go(1)) }, last ? "Let's go" : i === 0 ? "Show me around" : "Next")));
    const target = step.target && document.querySelector(step.target);
    if (target) target.scrollIntoView({ block: "center", behavior: "instant" });
    requestAnimationFrame(place);
    bubble.querySelector(".tour-foot button:last-child").focus();
  }

  window.addEventListener("resize", place);
  document.addEventListener("keydown", onKey);
  show();
}
