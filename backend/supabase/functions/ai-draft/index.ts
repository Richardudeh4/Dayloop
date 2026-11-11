// Turn a plain-language request into a validated draft (spec 3.4, 4.5, 7.10).
// The model key lives only in function secrets. Nothing is saved here: the app
// shows the draft and the user confirms.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { AiDraft, AiDraftRequest, type AiDraftInput } from "@shared/ai-draft.ts";
import { error, parseBody } from "@fn/http.ts";

const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? 50);
const MODEL = Deno.env.get("AI_MODEL") ?? "unset";

/** Provider call. Open question 10.4: which provider/model. Must return raw JSON text. */
async function callModel(_input: AiDraftInput): Promise<{ text: string; tokens?: number }> {
  if (!Deno.env.get("AI_API_KEY")) throw new Error("ai_not_configured");
  // TODO: call the chosen model with structured JSON output.
  throw new Error("ai_not_implemented");
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return error(405, "method_not_allowed");
    const userId = ctx.userClaims!.id;
    const input = await parseBody(req, AiDraftRequest);
    if (input instanceof Response) return input;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await ctx.supabaseAdmin
      .from("ai_requests").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return error(429, "quota", "Daily AI limit reached");

    const log = async (status: string, tokens?: number) =>
      ctx.supabaseAdmin.from("ai_requests").insert({
        user_id: userId, input_hash: await sha256(input.text), model: MODEL, tokens, status,
      });

    // Validate; retry once on invalid output (spec 7.10).
    for (let attempt = 0; attempt < 2; attempt++) {
      let result;
      try {
        result = await callModel(input);
      } catch (e) {
        await log("error");
        return error(503, (e as Error).message);
      }
      try {
        const draft = AiDraft.parse(JSON.parse(result.text));
        await log("ok", result.tokens);
        return Response.json(draft);
      } catch {
        // fall through to retry
      }
    }
    await log("invalid_output");
    return error(422, "could_not_understand");
  }),
};
