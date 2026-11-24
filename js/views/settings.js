// Settings: profile, appearance, stats, password, tutorial, log out
const THEMES = [{ id: "night", label: "Night" }, { id: "day", label: "Day" }, { id: "black", label: "Black" }];

function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem("theme", id); } catch (_) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  refreshViz();
}

function themePicker() {
  const current = document.documentElement.dataset.theme || "night";
  return h("div", { class: "themes", role: "radiogroup", "aria-label": "Theme" }, THEMES.map(t => h("button", {
    class: `theme-opt${t.id === current ? " active" : ""}`, role: "radio", "aria-checked": String(t.id === current),
    onclick: () => { setTheme(t.id); renderSettings(); },
  },
    h("span", { class: "theme-swatch", "data-theme": t.id, style: "background:var(--bg)" },
      ["gold", "blue", "ruby", "green"].map(c => h("i", { style: `background:var(--${c})` }))),
    t.label)));
}

async function renderSettings() {
  const me = state.me;

  const visibility = h("input", { type: "checkbox", checked: me.is_public });
  visibility.addEventListener("change", async () => {
    await q(sb.from("profiles").update({ is_public: visibility.checked }).eq("id", me.id));
    me.is_public = visibility.checked;
  });

  const pwd = h("input", { type: "password", minlength: 6, autocomplete: "new-password", placeholder: "New password" });
  const pwd2 = h("input", { type: "password", minlength: 6, autocomplete: "new-password", placeholder: "Repeat new password" });
  const pwdMsg = h("p", { class: "muted small" });
  const pwdForm = h("form", {
    class: "stack",
    onsubmit: async e => {
      e.preventDefault();
      if (pwd.value.length < 6) return (pwdMsg.textContent = "6 characters minimum.");
      if (pwd.value !== pwd2.value) return (pwdMsg.textContent = "Passwords don't match.");
      const { error } = await sb.auth.updateUser({ password: pwd.value });
      pwdMsg.textContent = error ? errorText(error) : "Password changed.";
      if (!error) pwdForm.reset();
    },
  }, pwd, pwd2, h("button", { class: "secondary" }, "Change password"), pwdMsg);

  mount(el("view-settings"),
    h("section", { class: "profile-head" },
      h("div", { class: "avatar avatar-lg" }, me.username[0].toUpperCase()),
      h("p", { class: "profile-name" }, me.username),
      h("p", { class: "muted small" }, `Member since ${new Date(me.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`),
      h("p", { class: "muted small" }, "Profile picture and bio: coming soon.")),

    h("section", { class: "panel" }, h("h3", {}, "Theme"), themePicker()),

    me.is_admin ? null : h("section", { class: "panel" },
      h("h3", {}, "Privacy"),
      h("label", { class: "switch" }, visibility, h("span", { class: "slider" }), h("span", {}, "Share journal entries with my team by default"))),

    me.is_admin ? null : h("section", { class: "panel" }, h("h3", {}, "Stats"), statsTable()),

    h("section", { class: "panel" }, h("h3", {}, "Password"), pwdForm),

    h("section", { class: "panel" },
      h("h3", {}, "Session"),
      h("div", { class: "row" },
        me.is_admin ? null : h("button", { class: "secondary", onclick: () => { resetHints(); location.hash = "#today"; setTimeout(startTutorial, 300); } }, "Replay intro and tips"),
        h("button", { class: "secondary", onclick: logout }, "Log out"))));
}

function statsTable() {
  const a = state.attempts;
  const resolved = a.filter(x => x.result);
  const rows = [
    ["Rating", fmtNum(state.R.st.rating)],
    ["Current streak", streak().current],
    ["Best streak", streak().best],
    ["Streak freezes", streak().freezes],
    ["Days validated", Game.validatedDays(a).size],
    ["Rejections", resolved.filter(x => x.result === "rejected").length],
    ["Yes", resolved.filter(x => x.result === "accepted").length],
    ["Choked", resolved.filter(x => x.result === "choked").length],
  ];
  return h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", {}, k), h("dd", { class: "num" }, String(v))]));
}
