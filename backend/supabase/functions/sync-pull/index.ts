// Return rows changed since the device's last sync token (spec 7.9).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { PullRequest } from "@shared/sync.ts";
import { error, parseBody } from "@fn/http.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return error(405, "method_not_allowed");
    const body = await parseBody(req, PullRequest);
    if (body instanceof Response) return body;

    // TODO: also include changes collaborators made to items shared with this
    // user (today only the user's own changes are returned).
    const { data: log, error: logError } = await ctx.supabaseAdmin
      .from("change_log")
      .select("id, table_name, row_id, op")
      .eq("user_id", ctx.userClaims!.id)
      .gt("id", body.since)
      .order("id")
      .limit(body.limit);
    if (logError) return error(500, "pull_failed", logError.message);

    // Latest version of each row, read through RLS. Last entry per row wins.
    const latest = new Map<string, { id: number; table_name: string; row_id: string; op: string }>();
    for (const entry of log ?? []) latest.set(`${entry.table_name}:${entry.row_id}`, entry);

    const byTable = new Map<string, string[]>();
    for (const e of latest.values()) byTable.set(e.table_name, [...(byTable.get(e.table_name) ?? []), e.row_id]);

    const rows = new Map<string, unknown>();
    for (const [table, ids] of byTable) {
      const { data } = await ctx.supabase.from(table).select("*").in("id", ids);
      for (const row of data ?? []) rows.set(`${table}:${row.id}`, row);
    }

    const changes = [...latest.values()].map((e) => ({
      token: e.id,
      table: e.table_name,
      rowId: e.row_id,
      op: e.op,
      row: rows.get(`${e.table_name}:${e.row_id}`) ?? null,
    }));
    const nextToken = log?.length ? log[log.length - 1].id : body.since;

    return Response.json({ changes, nextToken, hasMore: (log?.length ?? 0) === body.limit });
  }),
};
