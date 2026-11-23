const VIEWS = ["auth", "pending", "home"];
const msg = document.getElementById("auth-msg");

function show(id) {
  VIEWS.forEach(v => (document.getElementById(v).hidden = v !== id));
}

async function render() {
  try {
    const profile = await getProfile();
    if (!profile) return show("auth");
    document.querySelectorAll(".js-username").forEach(el => (el.textContent = profile.username));
    if (!profile.approved) return show("pending");
    document.getElementById("admin-link").hidden = !profile.is_admin;
    show("home");
  } catch (err) {
    show("auth");
    msg.textContent = frError(err);
  }
}

document.getElementById("auth-form").addEventListener("submit", async e => {
  e.preventDefault();
  const action = e.submitter.dataset.action;
  const form = new FormData(e.target);
  const username = form.get("username").trim().toLowerCase();
  const email = toEmail(username);
  const password = form.get("password");
  msg.textContent = "";

  const { error } = action === "signup"
    ? await sb.auth.signUp({ email, password, options: { data: { username } } })
    : await sb.auth.signInWithPassword({ email, password });

  if (error) return (msg.textContent = frError(error));
  e.target.reset();
  render();
});

document.querySelectorAll(".js-logout").forEach(btn =>
  btn.addEventListener("click", async () => {
    await sb.auth.signOut();
    render();
  })
);

render();
