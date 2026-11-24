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
    h("section", { class: "composer" },
      h("div", { class: "composer-head" },
        h("span", { class: "eyebrow" }, `Today · ${fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}`)),
      dailySummary(state.attempts.filter(a => a.day === today)),
      text,
      h("div", { class: "composer-foot" },
        h("label", { class: "switch" }, publish, h("span", { class: "slider" }), h("span", {}, "Share with team")),
        save),
      hint),
    timeline(entries));
}

const isPublicLabel = publish => (publish.checked && !publish.disabled ? "Share" : "Save");

// All entries grouped by day, newest first
function timeline(entries) {
  if (!entries.length) return h("p", { class: "muted center empty-state" }, "Your entries will show up here.");
  const days = [...new Set(entries.map(e => e.day))];
  return h("section", { class: "timeline" },
    h("h3", {}, "Your journal"),
    days.map(day => h("div", { class: "tl-day" },
      h("div", { class: "tl-date" },
        h("b", {}, fmtDay(day, { day: "numeric" })),
        h("span", {}, fmtDay(day, { month: "short" })),
        h("span", { class: "tl-weekday" }, fmtDay(day, { weekday: "short" }))),
      h("div", { class: "tl-body" },
        dailySummary(state.attempts.filter(a => a.day === day)),
        entries.filter(e => e.day === day).map(e => h("article", { class: "tl-entry" },
          h("div", { class: "tl-meta" }, tag(e.is_public),
            h("span", { class: "muted small" }, new Date(e.created_at).toLocaleTimeString("en-GB", { timeStyle: "short" }))),
          h("p", { class: "pre" }, e.body)))))));
}
