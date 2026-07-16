import type { Env } from "../middleware/auth";
import { json, readJson } from "../utils";

export async function getPermissions(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT role, module, action, allowed FROM role_permissions ORDER BY role, module, action"
  ).all();

  return json({ data: results });
}

interface PermissionEntry {
  role: string;
  module: string;
  action: string;
  allowed: boolean;
}

export async function updatePermissions(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ permissions?: PermissionEntry[] }>(request);
  const permissions = body.permissions ?? [];

  const statements = permissions.map((p) =>
    env.DB.prepare(
      `INSERT INTO role_permissions (role, module, action, allowed) VALUES (?, ?, ?, ?)
       ON CONFLICT(role, module, action) DO UPDATE SET allowed = excluded.allowed`
    ).bind(p.role, p.module, p.action, p.allowed ? 1 : 0)
  );

  if (statements.length) {
    await env.DB.batch(statements);
  }

  return json({ success: true });
}
