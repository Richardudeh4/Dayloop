// Upload a batch of changes from a device's outbox (spec 3.6, 7.9).
// Writes go through the user's RLS-scoped client, so viewers can't edit shared
// items and nobody can touch other users' rows. The change log is written with
// the admin client and makes retries idempotent by changeId.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { PushRequest } from "@shared/sync.ts";
import { error, parseBody } from "@fn/http.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return error(405, "method_not_allowed");
    const userId = ctx.userClaims!.id;
    const body = await parseBody(req, PushRequest);
    if (body instanceof Response) return body;

    const { data: device } = await ctx.supabase
      .from("devices").select("id").eq("id", body.deviceId).maybeSingle();
    if (!device) return error(403, "unknown_device");

    // Skip changes already applied (retries after a crash).
    const ids = body.changes.map((c) => c.changeId);
    const { data: seen } = ids.length
      ? await ctx.supabaseAdmin.from("change_log").select("change_id").in("change_id", ids)
      : { data: [] };
    const already = new Set((seen ?? []).map((r) => r.change_id));

    const applied: string[] = [...already];
    const rejected: { changeId: string; reason: string }[] = [];

    // Apply in device order.
    for (const c of [...body.changes].sort((a, b) => a.deviceCounter - b.deviceCounter)) {
      if (already.has(c.changeId)) continue;

      // TODO(spec 7.9): field-level merge against the server row instead of
      // whole-row last-write-wins; keep conflicting titles in history.
      const write = c.op === "delete"
        ? ctx.supabase.from(c.table).update({ deleted_at: new Date().toISOString() }).eq("id", c.rowId).select("id")
        : ctx.supabase.from(c.table).upsert({ ...c.payload, id: c.rowId, user_id: undefined }).select("id");

      const { data, error: writeError } = await write;
      if (writeError || !data?.length) {
        rejected.push({ changeId: c.changeId, reason: writeError?.message ?? "not_allowed" });
        continue;
      }

      const { error: logError } = await ctx.supabaseAdmin.from("change_log").insert({
        change_id: c.changeId,
        user_id: userId,
        device_id: body.deviceId,
        device_counter: c.deviceCounter,
        table_name: c.table,
        row_id: c.rowId,
        op: c.op,
      });
      // 23505 = a concurrent retry logged it first; still counts as applied.
      if (logError && logError.code !== "23505") {
        rejected.push({ changeId: c.changeId, reason: logError.message });
        continue;
      }
      applied.push(c.changeId);
    }

    // Backup pushes (spec 5.3): only for items this user can see.
    if (body.backups.length) {
      const itemIds = [...new Set(body.backups.map((b) => b.itemId))];
      const { data: visible } = await ctx.supabase.from("items").select("id").in("id", itemIds);
      const ok = new Set((visible ?? []).map((r) => r.id));
      const jobs = body.backups.filter((b) => ok.has(b.itemId)).map((b) => ({
        alert_key: b.alertKey,
        user_id: userId,
        item_id: b.itemId,
        fire_at: b.fireAt,
        payload: { title: b.title, meetingUrl: b.meetingUrl },
        status: "pending",
      }));
      if (jobs.length) {
        await ctx.supabaseAdmin.from("backup_jobs").upsert(jobs, { onConflict: "alert_key" });
      }
    }

    return Response.json({ applied, rejected });
  }),
};
