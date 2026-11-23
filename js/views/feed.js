// Feed: public journal entries as posts, with reactions and collapsible replies
const REACTIONS = [{ kind: "thumbs", emoji: "👍" }, { kind: "strong", emoji: "💪" }];
const openThreads = new Set();

async function renderFeed() {
  const entries = await q(sb.from("recaps")
    .select("id, day, body, user_id, created_at, author:profiles!recaps_user_id_fkey(username), reactions(kind, user_id), replies(id, body, created_at, author:profiles!replies_user_id_fkey(username))")
    .eq("is_public", true)
    .order("day", { ascending: false }).order("created_at", { ascending: false }).limit(50));

  if (!entries.length) return mount(el("view-feed"), h("p", { class: "muted center empty-state" }, "Nothing here yet. Publish a journal entry to start the feed."));

  const userIds = [...new Set(entries.map(e => e.user_id))];
  const days = [...new Set(entries.map(e => e.day))];
  const attempts = await q(sb.from("attempts").select("user_id, day, title, difficulty, result, created_at")
    .in("user_id", userIds).in("day", days).not("result", "is", null));

  mount(el("view-feed"), h("div", { class: "feed" },
    entries.map(e => post(e, attempts.filter(a => a.user_id === e.user_id && a.day === e.day)))));
}

function reactionPills(e) {
  return REACTIONS.map(r => {
    const list = e.reactions.filter(x => x.kind === r.kind);
    const mine = list.some(x => x.user_id === state.me.id);
    return h("button", {
      class: `pill${mine ? " active" : ""}`, "aria-pressed": mine ? "true" : "false",
      onclick: async ev => {
        ev.currentTarget.disabled = true;
        if (mine) await q(sb.from("reactions").delete().match({ recap_id: e.id, user_id: state.me.id, kind: r.kind }));
        else await q(sb.from("reactions").insert({ recap_id: e.id, kind: r.kind }));
        renderFeed();
      },
    }, r.emoji, list.length ? h("span", { class: "num" }, String(list.length)) : null);
  });
}

// Delete button: admin on everything, users on their own replies
function deleteBtn(label, what, fn) {
  return h("button", {
    class: "icon-btn del", "aria-label": label, title: label,
    onclick: async ev => {
      ev.stopPropagation();
      if (!confirm(`Delete this ${what}? This can't be undone.`)) return;
      try { await fn(); renderFeed(); } catch (err) { alert(errorText(err)); }
    },
  }, "×");
}

function post(e, dayAttempts) {
  const mine = e.user_id === state.me.id;
  const admin = state.me.is_admin;
  const replies = [...e.replies].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const open = openThreads.has(e.id);
  const input = h("input", { placeholder: "Write a reply…", maxlength: 500 });

  const thread = h("div", { class: "thread", hidden: !open },
    replies.map(r => h("div", { class: "reply" },
      avatar(r.author.username, r.author.username === state.me.username),
      admin || r.author.username === state.me.username
        ? deleteBtn("Delete reply", "reply", () => q(sb.from("replies").delete().eq("id", r.id))) : null,
      h("div", {},
        h("div", { class: "reply-head" }, h("strong", {}, r.author.username), h("span", { class: "muted small" }, fmtAgo(r.created_at))),
        h("p", {}, r.body)))),
    h("form", {
      class: "reply-form",
      onsubmit: async ev => {
        ev.preventDefault();
        if (!input.value.trim()) return;
        await q(sb.from("replies").insert({ recap_id: e.id, body: input.value.trim() }));
        openThreads.add(e.id);
        renderFeed();
      },
    }, input, h("button", { class: "small" }, "Send")));

  const toggle = h("button", {
    class: "pill",
    onclick: () => {
      const nowOpen = thread.hidden;
      thread.hidden = !nowOpen;
      nowOpen ? openThreads.add(e.id) : openThreads.delete(e.id);
      if (nowOpen) input.focus();
    },
  }, "💬", h("span", { class: "num" }, replies.length ? String(replies.length) : "Reply"));

  return h("article", { class: "post" },
    h("header", { class: "post-head" },
      avatar(e.author.username, mine),
      h("div", {},
        h("strong", {}, e.author.username),
        h("span", { class: "muted small" }, ` · ${fmtDay(e.day, { day: "numeric", month: "short" })} · ${fmtAgo(e.created_at)}`)),
      admin ? deleteBtn("Delete post", "post (and its replies)", () => q(sb.from("recaps").delete().eq("id", e.id))) : null),
    dailySummary(dayAttempts),
    h("p", { class: "post-body pre" }, e.body),
    h("div", { class: "post-actions" }, reactionPills(e), toggle),
    thread);
}
