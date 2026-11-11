// Delete the caller's account and all server data (spec 7.11, 8.2).
// Every user-owned table cascades from auth.users, so deleting the auth user
// removes the rest. Local data on the phone is untouched.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { error } from "@fn/http.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return error(405, "method_not_allowed");
    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(ctx.userClaims!.id);
    if (deleteError) return error(500, "delete_failed", deleteError.message);
    return Response.json({ ok: true });
  }),
};
