// Journal: unlimited private entries, max one public entry per day
async function renderJournal() {
  const today = Game.today();
  const entries = await q(sb.from("recaps").select("id, day, body, is_public, created_at")
    .eq("user_id", state.me.id).order("day", { ascending: false }).order("created_at", { ascending: false }));
  const publishedToday = entries.some(e => e.day === today && e.is_public);

  const text = h("textarea", { rows: 6, placeholder: "How did today go?" });
  const publish = h("input", { type: "checkbox", checked: state.me.is_public && !publishedToday, disabled: publishedToday });
  const warning = h("p", { class: "warn" });
  const updateWarning = () => {
    warning.textContent = publishedToday
      ? "You already published today. New entries stay private."
      : publish.checked
        ? "Public: this entry will be visible to everyone in the feed. Only one public entry per day."
        : "Private: only you will see this entry.";
  };
  publish.addEventListener("change", updateWarning);
  updateWarning();

  const save = h("button", {
    onclick: async () => {
      const body = text.value.trim();
      if (!body) return;
      const isPublic = publish.checked && !publishedToday;
      if (isPublic && !confirm("Publish this entry? It will be visible to everyone, and it's your only public entry today.")) return;
      save.disabled = true;
      try {
        await q(sb.from("recaps").insert({ day: today, body, is_public: isPublic }));
        renderJournal();
      } catch (err) { save.disabled = false; alert(errorText(err)); }
    },
  }, "Save entry");

  mount(el("view-journal"),
    h("h3", {}, `Today · ${fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}`),
    dailySummary(state.attempts.filter(a => a.day === today)),
    text,
    h("label", { class: "inline" }, publish, " Publish today's entry"),
    warning,
    save,
    pastEntries(entries));
}

// All entries grouped by day, newest first (no comments)
function pastEntries(entries) {
  if (!entries.length) return null;
  const days = [...new Set(entries.map(e => e.day))];
  return h("div", { class: "journal-days" },
    h("h3", {}, "All entries"),
    days.map(day => h("section", { class: "journal-day" },
      h("h4", {}, fmtDay(day)),
      dailySummary(state.attempts.filter(a => a.day === day)),
      entries.filter(e => e.day === day).map(e => h("article", { class: "entry" },
        h("p", { class: "muted small" }, tag(e.is_public), " ", new Date(e.created_at).toLocaleTimeString("en-GB", { timeStyle: "short" })),
        h("p", { class: "pre" }, e.body))))));
}
