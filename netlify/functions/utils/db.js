const { createClient } = require('@supabase/supabase-js');

// SERVICE ROLE key — full access, bypasses RLS.
// Only ever used here, on the server. Never sent to the browser.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
