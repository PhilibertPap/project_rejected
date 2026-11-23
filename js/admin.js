// Admin: approve pending accounts
function userItem(p, pending) {
  return h("li", {}, h("span", {}, p.username),
    pending ? h("button", {
      class: "small",
      onclick: async e => {
        e.currentTarget.disabled = true;
        try { await q(sb.rpc("approve_user", { target: p.id })); load(); }
        catch (err) { el("admin-msg").textContent = errorText(err); e.currentTarget.disabled = false; }
      },
    }, "Approve") : null);
}

async function load() {
  const me = await getProfile().catch(() => null);
  if (!me || !me.is_admin) return (el("admin-msg").textContent = "Admin only.");
  const users = await q(sb.from("profiles").select("id, username, approved").order("created_at"));
  const pending = users.filter(p => !p.approved);
  el("pending-list").replaceChildren(...(pending.length ? pending.map(p => userItem(p, true)) : [h("li", { class: "muted" }, "Nobody")]));
  el("approved-list").replaceChildren(...users.filter(p => p.approved).map(p => userItem(p, false)));
  el("admin").hidden = false;
}

load();
