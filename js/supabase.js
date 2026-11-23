// Client Supabase partagé + utilitaires
const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Supabase exige un email : on en fabrique un à partir du pseudo (aucun mail n'est envoyé)
const EMAIL_DOMAIN = "rejected.local";
function toEmail(username) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

// Profil de l'utilisateur connecté, ou null
async function getProfile() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb
    .from("profiles").select("*").eq("id", session.user.id).single();
  if (error) throw error;
  return data;
}

// Messages d'erreur en français
function frError(err) {
  const m = (err && err.message) || String(err);
  if (m.includes("Invalid login credentials")) return "Pseudo ou mot de passe incorrect.";
  if (m.includes("already registered")) return "Ce pseudo est déjà pris.";
  if (m.includes("Password should be")) return "Mot de passe trop court (6 caractères minimum).";
  return m;
}
