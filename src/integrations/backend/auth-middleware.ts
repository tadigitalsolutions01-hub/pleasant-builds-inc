// Validates the request bearer token against the project's Supabase backend.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createSupabaseFetch, serverSupabaseConfig } from "./env";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url, publishableKey } = serverSupabaseConfig();
    if (!publishableKey) throw new Error("Missing APP_SUPABASE_PUBLISHABLE_KEY");

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
    if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized: Only Bearer tokens are supported");

    const token = authHeader.slice("Bearer ".length);
    if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

    const supabase = createClient<Database>(url, publishableKey, {
      global: {
        fetch: createSupabaseFetch(publishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw new Error("Unauthorized: Invalid token");

    return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
  },
);
