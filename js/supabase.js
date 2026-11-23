// Shared Supabase client + helpers
const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Supabase needs an email: we derive a fake one from the username (no email is ever sent)
const EMAIL_DOMAIN = "rejected.local";
const toEmail = username => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

async function getProfile() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) throw error;
  return data;
}

function errorText(err) {
  const m = (err && err.message) || String(err);
  if (m.includes("Invalid login credentials")) return "Wrong username or password.";
  if (m.includes("already registered")) return "This username is taken.";
  if (m.includes("Password should be")) return "Password too short (6 characters minimum).";
  return m;
}

// Throws on Supabase errors, returns data
async function q(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
