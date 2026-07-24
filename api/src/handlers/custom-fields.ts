import type { Env } from "../middleware/auth";
import { json, error, readJson } from "../utils";

interface CustomFieldRow {
  id: string;
  label: string;
  type: string;
  options: string | null;
  sort_order: number;
}

interface CustomFieldBody {
  label?: string;
  type?: string;
  options?: string[];
}

function toApi(row: CustomFieldRow) {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    options: row.options ? (JSON.parse(row.options) as string[]) : undefined,
  };
}

/** GET /api/custom-fields — danh sách định nghĩa cột. */
export async function listCustomFields(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, label, type, options, sort_order FROM custom_fields ORDER BY sort_order, created_at`,
  ).all<CustomFieldRow>();
  return json({ data: (results ?? []).map(toApi) });
}

/** POST /api/custom-fields — tạo cột mới. */
export async function createCustomField(request: Request, env: Env): Promise<Response> {
  const body = await readJson<CustomFieldBody>(request);
  const label = (body.label ?? "").trim();
  if (!label) return error("Thiếu tên cột", 400);
  const type = body.type === "number" || body.type === "select" ? body.type : "text";
  const id = `cf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const options = type === "select" && body.options?.length ? JSON.stringify(body.options) : null;

  const orderRow = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM custom_fields`,
  ).first<{ next: number }>();

  await env.DB.prepare(
    `INSERT INTO custom_fields (id, label, type, options, sort_order) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, label, type, options, orderRow?.next ?? 1)
    .run();

  return json({ id, label, type, options: options ? (JSON.parse(options) as string[]) : undefined }, 201);
}

/** DELETE /api/custom-fields/:id — xoá cột (và các giá trị liên quan). */
export async function deleteCustomField(_request: Request, env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM employee_custom_values WHERE field_id = ?`).bind(id).run();
  await env.DB.prepare(`DELETE FROM custom_fields WHERE id = ?`).bind(id).run();
  return json({ success: true });
}

/** GET /api/custom-fields/values — toàn bộ giá trị theo nhân viên: { [employeeId]: { [fieldId]: value } }. */
export async function listCustomValues(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT employee_id, field_id, value FROM employee_custom_values`,
  ).all<{ employee_id: number; field_id: string; value: string | null }>();
  const map: Record<string, Record<string, string>> = {};
  for (const r of results ?? []) {
    const key = String(r.employee_id);
    (map[key] ??= {})[r.field_id] = r.value ?? "";
  }
  return json({ data: map });
}

/** PUT /api/employees/:id/custom-values — lưu giá trị cột cho một nhân viên. */
export async function saveCustomValues(request: Request, env: Env, employeeId: string): Promise<Response> {
  const body = await readJson<Record<string, string>>(request);
  const stmts = Object.entries(body).map(([fieldId, value]) =>
    env.DB.prepare(
      `INSERT INTO employee_custom_values (employee_id, field_id, value)
       VALUES (?, ?, ?)
       ON CONFLICT(employee_id, field_id) DO UPDATE SET value = excluded.value`,
    ).bind(Number(employeeId), fieldId, value ?? ""),
  );
  if (stmts.length) await env.DB.batch(stmts);
  return json({ success: true });
}
