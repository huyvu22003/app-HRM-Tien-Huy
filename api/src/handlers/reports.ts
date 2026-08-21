import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";

async function employeeIdOf(env: Env, userId: number): Promise<number | null> {
  const u = await env.DB.prepare("SELECT employee_id FROM users WHERE id = ?").bind(userId).first<{ employee_id: number | null }>();
  return u?.employee_id ?? null;
}

/** GET /api/reports?date=YYYY-MM-DD — báo cáo ngày, kèm tên nhân viên & người xác nhận. */
export async function listReports(request: Request, env: Env): Promise<Response> {
  const params = getParams(new URL(request.url));
  const date = params.date;
  if (!date) return error("Thiếu tham số date (VD: 2026-08-20)", 400);

  const { results } = await env.DB.prepare(
    `SELECT r.*, e.name AS employee_name, e.code AS employee_code, d.name AS department_name,
            ve.name AS verified_by_name
     FROM reports r
     JOIN employees e ON e.id = r.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN users vu ON vu.id = r.verified_by
     LEFT JOIN employees ve ON ve.id = vu.employee_id
     WHERE r.date = ?
     ORDER BY r.submitted_at DESC`,
  )
    .bind(date)
    .all();
  return json({ data: results });
}

interface ReportBody {
  date?: string;
  content?: string;
  quantity?: number;
  ng_count?: number;
  note?: string;
}

/** POST /api/reports — nhân viên nộp báo cáo ngày (tự phục vụ). */
export async function createReport(request: Request, env: Env, userId: number): Promise<Response> {
  const empId = await employeeIdOf(env, userId);
  if (!empId) return error("Tài khoản chưa gắn nhân viên", 404);
  const body = await readJson<ReportBody>(request);
  if (!body.date || !body.content?.trim()) return error("Thiếu ngày hoặc nội dung báo cáo", 400);

  const res = await env.DB.prepare(
    "INSERT INTO reports (employee_id, date, content, quantity, ng_count, note) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(empId, body.date, body.content.trim(), body.quantity ?? 0, body.ng_count ?? 0, body.note ?? null)
    .run();
  return json({ id: res.meta.last_row_id }, 201);
}

/** PUT /api/reports/:id — tổ trưởng/HR xác nhận hoặc trả lại báo cáo. */
export async function verifyReport(request: Request, env: Env, id: string, userId: number): Promise<Response> {
  const body = await readJson<{ action?: "verify" | "reject"; note?: string }>(request);
  const status = body.action === "reject" ? "rejected" : "verified";
  const r = await env.DB.prepare("SELECT id FROM reports WHERE id = ?").bind(id).first();
  if (!r) return error("Không tìm thấy báo cáo", 404);

  await env.DB.prepare(
    "UPDATE reports SET status = ?, verified_by = ?, verified_at = datetime('now'), note = COALESCE(?, note) WHERE id = ?",
  )
    .bind(status, userId, body.note ?? null, id)
    .run();
  return json({ success: true, status });
}
