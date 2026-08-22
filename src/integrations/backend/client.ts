// Browser Supabase client for the project's backend.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { browserSupabaseConfig, createSupabaseFetch } from "./env";

function build() {
  const { url, key } = browserSupabaseConfig();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: ReturnType<typeof build> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof build>, {
  get(_, prop, receiver) {
    if (!_client) _client = build();
    return Reflect.get(_client, prop, receiver);
  },
});
