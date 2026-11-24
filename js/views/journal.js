// Journal: composer for today + timeline of all entries (no comments)
async function renderJournal() {
  const today = Game.today();
  const entries = await q(sb.from("recaps").select("id, day, body, is_public, created_at")
    .eq("user_id", state.me.id).order("day", { ascending: false }).order("created_at", { ascending: false }));
  const publishedToday = entries.some(e => e.day === today && e.is_public);

  const text = h("textarea", { rows: 5, placeholder: "How did it go? What did you feel before, during, after?" });
  const publish = h("input", { type: "checkbox", checked: state.me.is_public && !publishedToday, disabled: publishedToday });
  const hint = h("p", { class: "hint" });
  const updateHint = () => {
    hint.textContent = publishedToday ? "You already shared an entry today. New entries stay private."
      : publish.checked ? "Your team will see it. One shared entry per day."
      : "Only you will see this entry.";
    hint.classList.toggle("hint-public", publish.checked && !publishedToday);
  };
  publish.addEventListener("change", updateHint);
  updateHint();

  const save = h("button", {
    onclick: async () => {
      const body = text.value.trim();
      if (!body) return text.focus();
      const isPublic = publish.checked && !publishedToday;
      if (isPublic && !confirm("Share this entry with your team? It's your only shared entry today.")) return;
      save.disabled = true;
      try {
        await q(sb.from("recaps").insert({ day: today, body, is_public: isPublic }));
        renderJournal();
      } catch (err) { save.disabled = false; alert(errorText(err)); }
    },
  }, isPublicLabel(publish));
  publish.addEventListener("change", () => (save.textContent = isPublicLabel(publish)));

  mount(el("view-journal"),
    pageHead("Journal"),
    firstVisitTip("journal"),
    h("section", { class: "composer" },
      h("div", { class: "composer-head" },
        h("span", { class: "eyebrow" }, `Today · ${fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}`)),
      dayRecap(today),
      text,
      h("div", { class: "composer-foot" },
        h("label", { class: "switch" }, publish, h("span", { class: "slider" }), h("span", {}, "Share with team")),
        save),
      hint),
    timeline(entries));
}

const isPublicLabel = publish => (publish.checked && !publish.disabled ? "Share" : "Save");

// Recap of a day: the story card (done, choked or not done) and up to 2 side quests. Tap to see the card.
function dayRecap(day) {
  const resolved = state.attempts.filter(a => a.day === day && a.result).sort(Game.byTime);
  const story = resolved.filter(a => !Game.isSit(a));
  const storyAttempt = story.find(Game.isDone) || story[story.length - 1];
  const side = resolved.filter(Game.isSit);
  const sideShown = [...side.filter(Game.isDone), ...side.filter(a => !Game.isDone(a))].slice(0, 2);
  return h("div", { class: "recap" },
    storyAttempt ? recapChip(storyAttempt, "Story")
      : h("div", { class: "chip-card chip-empty" }, h("span", { class: "recap-kind" }, "Story"), h("span", { class: "muted small" }, "Not done")),
    sideShown.map(a => recapChip(a, "Side quest")),
    side.length > 2 ? h("p", { class: "muted small recap-more" }, `+${side.length - 2} more side quest${side.length - 2 > 1 ? "s" : ""}`) : null);
}

function recapChip(a, kind) {
  const d = a.difficulty;
  return h("button", { class: `chip-card recap-chip suit-${d}`, onclick: () => showCard(a), title: "See the card" },
    h("span", { class: "chip-corner" }, h("b", {}, String(d)), h("span", { class: "suit-mark" }, SUITS[d].symbol)),
    h("span", { class: "chip-title" }, h("span", { class: "recap-kind" }, kind), a.title),
    h("span", { class: `badge badge-${a.result}` }, RESULT_LABEL[a.result]));
}

// The card as it was that day, in a modal
function showCard(a) {
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  const overlay = h("div", { class: "overlay", onclick: e => { if (e.target === overlay || e.target.closest(".card")) close(); } },
    h("div", { class: "card-view", role: "dialog", "aria-modal": "true" },
      cardEl(cardFront({ ...cardFor(a), title: a.title, difficulty: a.difficulty }), true),
      h("p", { class: "center" }, h("span", { class: `badge badge-${a.result}` }, RESULT_LABEL[a.result]),
        h("span", { class: "muted small" }, ` ${fmtDay(a.day, { weekday: "long", day: "numeric", month: "long" })}`)),
      h("button", { class: "secondary", onclick: close }, "Close")));
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
}

// Every day with a journal entry or a card played, newest first
function timeline(entries) {
  const days = [...new Set([...entries.map(e => e.day), ...state.attempts.filter(a => a.result).map(a => a.day)])]
    .filter(d => d !== Game.today() || entries.some(e => e.day === d)).sort().reverse();
  if (!days.length) return h("p", { class: "muted center empty-state" }, "Your past days will show up here.");
  return h("section", { class: "timeline" },
    h("h3", {}, "Your journal"),
    days.map(day => h("div", { class: "tl-day" },
      h("div", { class: "tl-date" },
        h("b", {}, fmtDay(day, { day: "numeric" })),
        h("span", {}, fmtDay(day, { month: "short" })),
        h("span", { class: "tl-weekday" }, fmtDay(day, { weekday: "short" }))),
      h("div", { class: "tl-body" },
        day === Game.today() ? null : dayRecap(day),  // today's recap is in the composer
        entries.filter(e => e.day === day).map(e => h("article", { class: "tl-entry" },
          h("div", { class: "tl-meta" }, tag(e.is_public, "Shared"),
            h("span", { class: "muted small" }, new Date(e.created_at).toLocaleTimeString("en-GB", { timeStyle: "short" }))),
          h("p", { class: "pre" }, e.body)))))));
}
