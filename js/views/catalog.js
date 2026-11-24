// Admin: card catalogue — search, edit, add, archive, delete
const catalogUi = { search: "", mode: "all", editing: null, showInactive: false };
const MODES = { story: "Story", sunday: "Sunday", situation: "Situation" };

const slugify = s => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function cardForm(card) {
  const isNew = !card;
  const c = card || { mode: "situation", difficulty: 2, place: "street", duo: false, tone: "serious", crush: false, active: true };
  const f = {
    mode: h("select", {}, Object.entries(MODES).map(([k, v]) => h("option", { value: k, selected: c.mode === k }, v))),
    title: h("input", { value: c.title || "", required: true, maxlength: 80 }),
    body: h("textarea", { rows: 3, maxlength: 500 }),
    tip: h("textarea", { rows: 2, maxlength: 400, placeholder: "Optional tip shown on the card" }),
    difficulty: h("select", {}, [1, 2, 3, 4, 5].map(n => h("option", { value: n, selected: c.difficulty === n }, `${SUITS[n].symbol} ${n}`))),
    place: h("select", {}, [h("option", { value: "" }, "—"), ...Object.entries(PLACE_LABEL).map(([k, v]) => h("option", { value: k, selected: c.place === k }, v))]),
    day: h("input", { type: "number", min: 1, max: 99, value: c.day ?? "" }),
    week: h("input", { type: "number", min: 1, max: 20, value: c.week ?? "" }),
    duo: h("input", { type: "checkbox", checked: !!c.duo }),
    fun: h("input", { type: "checkbox", checked: c.tone === "fun" }),
    crush: h("input", { type: "checkbox", checked: !!c.crush }),
    checkpoint: h("input", { type: "checkbox", checked: !!c.checkpoint }),
    active: h("input", { type: "checkbox", checked: c.active !== false }),
  };
  f.body.value = c.body || "";
  f.tip.value = c.tip || "";
  const msg = h("p", { class: "msg" });
  const check = (input, label) => h("label", { class: "inline small" }, input, ` ${label}`);

  const save = async e => {
    e.preventDefault();
    const mode = f.mode.value;
    const row = {
      mode, title: f.title.value.trim(), body: f.body.value.trim(), tip: f.tip.value.trim() || null,
      difficulty: Number(f.difficulty.value), place: f.place.value || null,
      day: f.day.value ? Number(f.day.value) : null, week: f.week.value ? Number(f.week.value) : null,
      duo: f.duo.checked, tone: f.fun.checked ? "fun" : "serious", crush: f.crush.checked,
      checkpoint: f.checkpoint.checked, active: f.active.checked, updated_at: new Date().toISOString(),
    };
    if (!row.title) return (msg.textContent = "Title required.");
    if (mode === "situation" && !row.place) return (msg.textContent = "A situation card needs a place.");
    if (mode === "story" && !row.day) return (msg.textContent = "A story card needs a day.");
    try {
      if (isNew) {
        row.id = mode === "story" ? `d${row.day}` : mode === "sunday" ? `sun${row.week}` : `s-${row.place}-${slugify(row.title)}`;
        if (state.cards.some(x => x.id === row.id)) return (msg.textContent = `Id ${row.id} already exists.`);
        await q(sb.from("cards").insert(row));
      } else {
        await q(sb.from("cards").update(row).eq("id", c.id));
      }
      state.cards = await q(sb.from("cards").select("*").order("id"));
      catalogUi.editing = null;
      renderCatalog();
    } catch (err) { msg.textContent = errorText(err); }
  };

  const del = async () => {
    if (!confirm(`Delete "${c.title}" for good? Past plays keep their title. To hide it instead, untick Active.`)) return;
    try {
      await q(sb.from("cards").delete().eq("id", c.id));
      state.cards = state.cards.filter(x => x.id !== c.id);
      catalogUi.editing = null;
      renderCatalog();
    } catch (err) { msg.textContent = errorText(err); }
  };

  return h("form", { class: "panel card-form", onsubmit: save },
    h("p", { class: "eyebrow" }, isNew ? "New card" : `Edit · ${c.id}`),
    h("div", { class: "form-grid" },
      h("label", {}, "Mode", f.mode), h("label", {}, "Difficulty", f.difficulty), h("label", {}, "Place", f.place),
      h("label", {}, "Story day", f.day), h("label", {}, "Week", f.week)),
    h("label", {}, "Title", f.title),
    h("label", {}, "Challenge", f.body),
    h("label", {}, "Tip", f.tip),
    h("div", { class: "row" }, check(f.duo, "Duo"), check(f.fun, "Fun"), check(f.crush, "Flirt"), check(f.checkpoint, "Checkpoint"), check(f.active, "Active")),
    msg,
    h("div", { class: "row" },
      h("button", { type: "submit" }, isNew ? "Add card" : "Save"),
      h("button", { type: "button", class: "secondary", onclick: () => { catalogUi.editing = null; renderCatalog(); } }, "Cancel"),
      isNew ? null : h("button", { type: "button", class: "danger", onclick: del }, "Delete")));
}

async function renderCatalog() {
  const search = h("input", { type: "search", placeholder: "Search title, text, id…", value: catalogUi.search });
  const modeSel = h("select", {}, [["all", "All modes"], ...Object.entries(MODES)].map(([k, v]) => h("option", { value: k, selected: catalogUi.mode === k }, v)));
  const inactive = h("input", { type: "checkbox", checked: catalogUi.showInactive });
  const list = h("div", { class: "catalog-list" });

  const draw = () => {
    const qtext = catalogUi.search.toLowerCase();
    const rows = state.cards
      .filter(c => catalogUi.mode === "all" || c.mode === catalogUi.mode)
      .filter(c => catalogUi.showInactive || c.active)
      .filter(c => !qtext || `${c.id} ${c.title} ${c.body} ${c.place || ""}`.toLowerCase().includes(qtext))
      .sort((a, b) => (a.mode === b.mode ? (a.day ?? 0) - (b.day ?? 0) || a.id.localeCompare(b.id) : a.mode.localeCompare(b.mode)));
    mount(list, rows.length ? rows.map(c => catalogUi.editing === c.id ? cardForm(c) : h("button", {
      class: `catalog-row${c.active ? "" : " inactive"}`, onclick: () => { catalogUi.editing = c.id; draw(); },
    },
      suitBadge(c.difficulty),
      h("span", { class: "grow left" }, h("strong", {}, c.title),
        h("span", { class: "muted small block" }, [MODES[c.mode], c.day ? `day ${c.day}` : null, c.place ? PLACE_LABEL[c.place] : null,
          c.duo ? "duo" : null, c.tone === "fun" ? "fun" : null, c.crush ? "crush" : null, c.checkpoint ? "checkpoint" : null,
          c.active ? null : "inactive"].filter(Boolean).join(" · "))),
      h("span", { class: "muted small" }, c.id))) : h("p", { class: "muted" }, "No card matches."));
  };
  search.addEventListener("input", () => { catalogUi.search = search.value.trim(); draw(); });
  modeSel.addEventListener("change", () => { catalogUi.mode = modeSel.value; draw(); });
  inactive.addEventListener("change", () => { catalogUi.showInactive = inactive.checked; draw(); });
  draw();

  const counts = Object.keys(MODES).map(m => `${state.cards.filter(c => c.mode === m && c.active).length} ${MODES[m].toLowerCase()}`).join(" · ");
  mount(el("view-catalog"),
    h("div", { class: "row between catalog-head" },
      h("p", { class: "muted small" }, counts),
      h("button", { class: "small", onclick: () => { catalogUi.editing = "new"; renderCatalog(); } }, "+ New card")),
    catalogUi.editing === "new" ? cardForm(null) : null,
    h("div", { class: "row" }, search, modeSel),
    h("label", { class: "inline small" }, inactive, " Show inactive"),
    list);
}
