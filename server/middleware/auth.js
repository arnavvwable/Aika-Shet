const { supabaseAdmin } = require('../supabase');

async function verifyToken(token) {
  if (!token) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return {
      uid: user.id,
      name: user.user_metadata?.full_name || user.email.split('@')[0],
      email: user.email
    };
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

module.exports = {
  verifyToken
};
