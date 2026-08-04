import { createClient } from '@supabase/supabase-js';

// The anon key is safe to expose in the browser — it has no access to any
// table (RLS is enabled with zero policies) and no access to Storage beyond
// completing an upload for which our backend already issued a signed token.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
