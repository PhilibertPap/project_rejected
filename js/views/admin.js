// Admin: approve / refuse accounts, players overview
async function renderAdmin() {
  const [users, attempts] = await Promise.all([
    q(sb.rpc("admin_users")),
    q(sb.from("attempts").select("user_id, day, difficulty, result, created_at")),
  ]);
  const pending = users.filter(u => !u.approved);
  const players = users.filter(u => u.approved);

  const act = (label, cls, fn) => h("button", {
    class: `small ${cls}`,
    onclick: async e => {
      e.currentTarget.disabled = true;
      try { await fn(); renderAdmin(); }
      catch (err) { alert(errorText(err)); e.currentTarget.disabled = false; }
    },
  }, label);

  const pendingList = pending.length
    ? h("ul", { class: "list" }, pending.map(u => h("li", {},
        h("span", {}, h("strong", {}, u.username), h("span", { class: "muted small" }, ` · signed up ${fmtDateTime(u.created_at)}`)),
        h("span", { class: "row" },
          act("Approve", "", () => q(sb.rpc("approve_user", { target: u.id }))),
          act("Refuse", "secondary", async () => {
            if (!confirm(`Refuse and delete the account "${u.username}"?`)) throw new Error("Cancelled");
            await q(sb.rpc("reject_user", { target: u.id }));
          })))))
    : h("p", { class: "muted" }, "Nobody waiting.");

  const rows = players.map(u => {
    const mine = attempts.filter(a => a.user_id === u.id);
    const lastDay = mine.filter(a => a.result).map(a => a.day).sort().pop();
    return h("tr", {},
      h("td", {}, u.username),
      h("td", {}, String(Game.total(mine))),
      h("td", {}, String(Game.streak(mine))),
      h("td", {}, Game.level(mine, state.data.level).toFixed(1)),
      h("td", {}, String(Game.validatedDays(mine).size)),
      h("td", {}, lastDay ? fmtDay(lastDay, { day: "numeric", month: "short" }) : "—"),
      h("td", {}, fmtDateTime(u.last_sign_in_at)));
  });

  mount(el("view-admin"),
    h("h3", {}, `Pending (${pending.length})`),
    pendingList,
    h("h3", {}, `Players (${players.length})`),
    players.length
      ? h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, ["User", "Pts", "Streak", "Level", "Days", "Last played", "Last login"].map(t => h("th", {}, t)))),
          h("tbody", {}, rows)))
      : h("p", { class: "muted" }, "No players yet."));
}
