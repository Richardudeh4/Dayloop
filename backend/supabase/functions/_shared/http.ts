import type { z } from "zod";

export function error(status: number, code: string, message?: string) {
  return Response.json({ error: { code, message: message ?? code } }, { status });
}

/** Parse the JSON body against a schema; returns data or a 400 Response. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "invalid_json");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(400, "invalid_body", parsed.error.message);
  return parsed.data;
}
