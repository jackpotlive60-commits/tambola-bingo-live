import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cxsphquezichwppzahrj.supabase.co";
const supabasePublishableKey =
  "sb_publishable_RTWJzA3xKWk05tRYI_T13g_mjw5wSzd";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
