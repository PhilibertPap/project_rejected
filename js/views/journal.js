// Journal: one entry per day, public or private depending on the profile setting
function daySummary(attempts) {
  const done = attempts.filter(a => a.result);
  if (!done.length) return h("p", { class: "muted" }, "No challenge played.");
  return h("ul", { class: "list compact" }, done.map(a =>
    h("li", {}, h("span", {}, a.title), h("span", { class: "muted" }, `${RESULT_LABEL[a.result]} ${fmtPts(Game.points(a))}`))));
}

async function renderJournal() {
  const today = Game.today();
  const entries = await q(sb.from("recaps").select("*").eq("user_id", state.me.id).order("day", { ascending: false }));
  const current = entries.find(e => e.day === today);

  const toggle = h("input", { type: "checkbox", checked: state.me.is_public });
  toggle.addEventListener("change", async () => {
    await q(sb.from("profiles").update({ is_public: toggle.checked }).eq("id", state.me.id));
    state.me.is_public = toggle.checked;
  });

  const text = h("textarea", { rows: 6, placeholder: "How did today go?" });
  text.value = current ? current.body : "";
  const saved = h("span", { class: "muted" });
  const save = h("button", {
    onclick: async () => {
      await q(sb.from("recaps").upsert(
        { user_id: state.me.id, day: today, body: text.value.trim() }, { onConflict: "user_id,day" }));
      saved.textContent = " Saved.";
      renderJournalPast();
    },
  }, "Save entry");

  el("view-journal").replaceChildren(
    h("label", { class: "inline" }, toggle, " Public profile (entries appear in the feed)"),
    h("h3", {}, `Today · ${today}`),
    daySummary(state.attempts.filter(a => a.day === today)),
    text, h("p", {}, save, saved),
    h("div", { id: "journal-past" }));
  renderJournalPast(entries);
}

async function renderJournalPast(entries) {
  entries = entries || await q(sb.from("recaps").select("*").eq("user_id", state.me.id).order("day", { ascending: false }));
  const past = entries.filter(e => e.day !== Game.today());
  el("journal-past").replaceChildren(
    past.length ? h("h3", {}, "Past entries") : null,
    ...past.map(e => h("article", { class: "entry" },
      h("p", { class: "muted" }, e.day),
      daySummary(state.attempts.filter(a => a.day === e.day)),
      h("p", { class: "pre" }, e.body))));
}
