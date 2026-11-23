// Feed: public journal entries, with reactions and replies
const REACTIONS = [{ kind: "thumbs", emoji: "👍" }, { kind: "strong", emoji: "💪" }];

async function renderFeed() {
  const entries = await q(sb.from("recaps")
    .select("id, day, body, user_id, created_at, author:profiles!recaps_user_id_fkey(username), reactions(kind, user_id), replies(id, body, created_at, author:profiles!replies_user_id_fkey(username))")
    .eq("is_public", true)
    .order("day", { ascending: false }).order("created_at", { ascending: false }).limit(50));

  if (!entries.length) return mount(el("view-feed"), h("p", { class: "muted" }, "Nothing here yet."));

  const userIds = [...new Set(entries.map(e => e.user_id))];
  const days = [...new Set(entries.map(e => e.day))];
  const attempts = await q(sb.from("attempts").select("user_id, day, title, difficulty, result, created_at")
    .in("user_id", userIds).in("day", days).not("result", "is", null));

  mount(el("view-feed"), entries.map(e => feedEntry(e, attempts.filter(a => a.user_id === e.user_id && a.day === e.day))));
}

function reactionBar(e) {
  return h("div", { class: "row reactions" }, REACTIONS.map(r => {
    const list = e.reactions.filter(x => x.kind === r.kind);
    const mine = list.some(x => x.user_id === state.me.id);
    return h("button", {
      class: `secondary small${mine ? " active" : ""}`,
      onclick: async ev => {
        ev.currentTarget.disabled = true;
        if (mine) await q(sb.from("reactions").delete().match({ recap_id: e.id, user_id: state.me.id, kind: r.kind }));
        else await q(sb.from("reactions").insert({ recap_id: e.id, kind: r.kind }));
        renderFeed();
      },
    }, `${r.emoji} ${list.length || ""}`);
  }));
}

function feedEntry(e, dayAttempts) {
  const input = h("input", { placeholder: "Reply…", maxlength: 500 });
  const replies = [...e.replies].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return h("article", { class: "entry" },
    h("p", {}, h("strong", {}, e.author.username), h("span", { class: "muted" }, ` · ${fmtDay(e.day, { day: "numeric", month: "short" })}`)),
    dailySummary(dayAttempts),
    h("p", { class: "pre" }, e.body),
    reactionBar(e),
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
}
