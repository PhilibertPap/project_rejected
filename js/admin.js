const adminMsg = document.getElementById("admin-msg");

function item(profile, withButton) {
  const li = document.createElement("li");
  const name = document.createElement("span");
  name.textContent = profile.username;
  li.append(name);
  if (withButton) {
    const btn = document.createElement("button");
    btn.textContent = "Valider";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const { error } = await sb.rpc("approve_user", { target: profile.id });
      if (error) { adminMsg.textContent = frError(error); btn.disabled = false; return; }
      load();
    });
    li.append(btn);
  }
  return li;
}

async function load() {
  const me = await getProfile().catch(() => null);
  if (!me || !me.is_admin) {
    adminMsg.textContent = "Accès réservé à l'admin.";
    return;
  }
  const { data, error } = await sb
    .from("profiles").select("id, username, approved, created_at").order("created_at");
  if (error) return (adminMsg.textContent = frError(error));

  const pending = document.getElementById("pending-list");
  const approved = document.getElementById("approved-list");
  pending.replaceChildren(...data.filter(p => !p.approved).map(p => item(p, true)));
  approved.replaceChildren(...data.filter(p => p.approved).map(p => item(p, false)));
  if (!pending.children.length) pending.innerHTML = '<li class="muted">Personne</li>';
  document.getElementById("admin").hidden = false;
}

load();
