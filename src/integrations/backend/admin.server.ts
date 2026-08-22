// Server-only privileged client (service/secret key). Never import from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createSupabaseFetch, serverSupabaseConfig } from "./env";

function build() {
  const { url, secretKey } = serverSupabaseConfig();
  if (!secretKey) throw new Error("Missing APP_SUPABASE_SECRET_KEY");
  return createClient<Database>(url, secretKey, {
    global: { fetch: createSupabaseFetch(secretKey) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof build> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof build>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = build();
    return Reflect.get(_admin, prop, receiver);
  },
});
