// Feed: public journal entries (plus your own), with replies
async function renderFeed() {
  const entries = await q(sb.from("recaps")
    .select("id, day, body, user_id, author:profiles!recaps_user_id_fkey(username, is_public), replies(id, body, created_at, author:profiles!replies_user_id_fkey(username))")
    .order("day", { ascending: false }).order("created_at", { ascending: false }).limit(50));

  const userIds = [...new Set(entries.map(e => e.user_id))];
  const days = [...new Set(entries.map(e => e.day))];
  const attempts = userIds.length
    ? await q(sb.from("attempts").select("user_id, day, title, difficulty, result")
        .in("user_id", userIds).in("day", days).not("result", "is", null))
    : [];

  if (!entries.length) return el("view-feed").replaceChildren(h("p", { class: "muted" }, "Nothing here yet."));

  el("view-feed").replaceChildren(...entries.map(e => {
    const dayAttempts = attempts.filter(a => a.user_id === e.user_id && a.day === e.day);
    const pts = Game.total(dayAttempts);
    const input = h("input", { placeholder: "Reply…", maxlength: 500 });
    const replies = [...e.replies].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return h("article", { class: "entry" },
      h("p", {}, h("strong", {}, e.author.username), h("span", { class: "muted" },
        ` · ${e.day} · ${fmtPts(pts)} pts`, e.user_id === state.me.id && !e.author.is_public ? " · private" : "")),
      daySummary(dayAttempts),
      h("p", { class: "pre" }, e.body),
      h("div", { class: "replies" },
        replies.map(r => h("p", {}, h("strong", {}, r.author.username), " ", r.body)),
        h("form", {
          class: "row",
          onsubmit: async ev => {
            ev.preventDefault();
            if (!input.value.trim()) return;
            await q(sb.from("replies").insert({ recap_id: e.id, body: input.value.trim() }));
            renderFeed();
          },
        }, input, h("button", { class: "secondary small" }, "Reply"))));
  }));
}
