// Settings: profile, stats, password, log out
async function renderSettings() {
  const me = state.me;

  const visibility = h("input", { type: "checkbox", checked: me.is_public });
  const visMsg = h("span", { class: "muted" });
  visibility.addEventListener("change", async () => {
    await q(sb.from("profiles").update({ is_public: visibility.checked }).eq("id", me.id));
    me.is_public = visibility.checked;
    visMsg.textContent = " Saved.";
  });

  const pwd = h("input", { type: "password", minlength: 6, autocomplete: "new-password", placeholder: "New password" });
  const pwd2 = h("input", { type: "password", minlength: 6, autocomplete: "new-password", placeholder: "Repeat new password" });
  const pwdMsg = h("p", { class: "muted" });
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
    h("section", { class: "settings-block" },
      h("h3", {}, "Profile"),
      h("div", { class: "row" },
        h("div", { class: "avatar" }, me.username[0].toUpperCase()),
        h("div", {},
          h("strong", {}, me.username),
          h("p", { class: "muted small" }, `Member since ${new Date(me.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`))),
      h("p", { class: "muted small" }, "Profile picture and bio: coming soon."),
      me.is_admin ? null : h("label", { class: "inline" }, visibility, " Journal entries public by default", visMsg)),

    me.is_admin ? null : h("section", { class: "settings-block" },
      h("h3", {}, "Stats"),
      statsTable()),

    h("section", { class: "settings-block" },
      h("h3", {}, "Password"),
      pwdForm),

    h("section", { class: "settings-block" },
      h("h3", {}, "Session"),
      h("button", { class: "secondary", onclick: logout }, "Log out")));
}

function statsTable() {
  const a = state.attempts;
  const resolved = a.filter(x => x.result);
  const rows = [
    ["Points", Game.total(a)],
    ["Current streak", Game.streak(a)],
    ["Best streak", Game.bestStreak(a)],
    ["Level", level().toFixed(1)],
    ["Days validated", Game.validatedDays(a).size],
    ["Rejections", resolved.filter(x => x.result === "rejected").length],
    ["Yes", resolved.filter(x => x.result === "accepted").length],
    ["Choked", resolved.filter(x => x.result === "choked").length],
  ];
  return h("ul", { class: "list compact" }, rows.map(([k, v]) => h("li", {}, h("span", {}, k), h("strong", {}, String(v)))));
}
