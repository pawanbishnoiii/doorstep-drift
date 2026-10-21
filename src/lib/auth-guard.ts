import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Auth middleware that verifies the bearer token with the auth server (getUser)
 * instead of local JWKS verification, so signing-key mismatches ("No suitable key
 * or wrong key type") can never break signed-in server calls.
 */
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Server is not configured.");
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) throw new Error("Please sign in again.");
  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session expired. Please sign in again.");
  return next({ context: { supabase, userId: data.user.id, claims: { sub: data.user.id, email: data.user.email } } });
});
