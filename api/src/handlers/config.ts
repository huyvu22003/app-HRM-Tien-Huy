import type { Env } from "../middleware/auth";
import { json, readJson } from "../utils";

export async function getConfig(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT key, value FROM rules_config").all<{
    key: string;
    value: string;
  }>();

  const config: Record<string, unknown> = {};
  for (const row of results) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }

  return json({ data: config });
}

export async function updateConfig(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, unknown>>(request);

  const statements = Object.entries(body).map(([key, value]) =>
    env.DB.prepare(
      `INSERT INTO rules_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, JSON.stringify(value))
  );

  if (statements.length) {
    await env.DB.batch(statements);
  }

  return json({ success: true });
}
