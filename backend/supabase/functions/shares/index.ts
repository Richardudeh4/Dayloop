// Owner-side share management (spec 3.6). Invitees accept directly through
// RLS (update shares set status = 'accepted').
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { z } from "zod";
import { error, parseBody } from "@fn/http.ts";

const ShareRequest = z.discriminatedUnion("action", [
  // TODO: invite by email/phone, including people without an account yet.
  z.object({ action: z.literal("invite"), itemId: z.uuid(), userId: z.uuid(), role: z.enum(["editor", "viewer"]) }),
  z.object({ action: z.literal("setRole"), itemId: z.uuid(), userId: z.uuid(), role: z.enum(["editor", "viewer"]) }),
  z.object({ action: z.literal("revoke"), itemId: z.uuid(), userId: z.uuid() }),
]);

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return error(405, "method_not_allowed");
    const me = ctx.userClaims!.id;
    const body = await parseBody(req, ShareRequest);
    if (body instanceof Response) return body;
    if (body.userId === me) return error(400, "cannot_share_with_self");

    const { data: item } = await ctx.supabase
      .from("items").select("id").eq("id", body.itemId).eq("user_id", me).maybeSingle();
    if (!item) return error(403, "not_owner");

    // TODO: rate-limit invites (spec 8.1).
    const shares = ctx.supabaseAdmin.from("shares");
    const result = body.action === "invite"
      ? await shares.upsert({ item_id: body.itemId, user_id: body.userId, role: body.role, status: "invited", invited_by: me })
      : body.action === "setRole"
      ? await shares.update({ role: body.role }).eq("item_id", body.itemId).eq("user_id", body.userId)
      : await shares.delete().eq("item_id", body.itemId).eq("user_id", body.userId);

    if (result.error) return error(500, "share_failed", result.error.message);
    return Response.json({ ok: true });
  }),
};
