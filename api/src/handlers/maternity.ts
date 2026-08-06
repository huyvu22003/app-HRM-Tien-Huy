import type { Env } from "../middleware/auth";
import { json, error, readJson, parseIdFromPath } from "../utils";

/**
 * Theo dõi thai kỳ: hồ sơ từ lúc báo mang thai → nghỉ sanh, kèm các lần khám
 * thai định kỳ (tối đa 5 lần; 1 ngày/lần, 2 ngày nếu thai bệnh lý/ở xa cơ sở y
 * tế; tính theo ngày làm việc). Mỗi lần khám cần giấy chứng nhận nghỉ hưởng BHXH.
 */

interface CheckupBody {
  seq: number;
  date?: string | null;
  days?: number;
  special?: boolean;
  docSubmitted?: boolean;
  docKey?: string | null;
  docName?: string | null;
  note?: string | null;
}

interface MaternityBody {
  employeeId?: number;
  notifiedDate?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  months?: number;
  children?: number;
  status?: string;
  note?: string | null;
}

const STATUSES = new Set(["soon", "active", "returning", "done"]);

/** GET /api/maternity — danh sách hồ sơ thai kỳ + các lần khám. */
export async function listMaternity(_request: Request, env: Env): Promise<Response> {
  const { results: records } = await env.DB.prepare(
    `SELECT m.*, e.name AS employee_name, e.code AS employee_code, d.name AS department_name
     FROM maternity_leaves m
     JOIN employees e ON e.id = m.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     ORDER BY COALESCE(m.notified_date, m.start_date) DESC`,
  ).all();

  const { results: checkups } = await env.DB.prepare(
    "SELECT * FROM prenatal_checkups ORDER BY maternity_id, seq",
  ).all<{ maternity_id: number }>();

  const byRecord = new Map<number, unknown[]>();
  for (const c of checkups) {
    const arr = byRecord.get(c.maternity_id) ?? [];
    arr.push(c);
    byRecord.set(c.maternity_id, arr);
  }
  const data = records.map((r) => ({ ...r, checkups: byRecord.get((r as { id: number }).id) ?? [] }));
  return json({ data });
}

/** POST /api/maternity — tạo hồ sơ thai kỳ mới. */
export async function createMaternity(request: Request, env: Env): Promise<Response> {
  const body = await readJson<MaternityBody>(request);
  if (!body.employeeId) return error("Thiếu nhân viên", 400);
  const status = body.status && STATUSES.has(body.status) ? body.status : "soon";
  const res = await env.DB.prepare(
    `INSERT INTO maternity_leaves
       (employee_id, notified_date, due_date, start_date, end_date, months, children, status, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.employeeId,
      body.notifiedDate ?? null,
      body.dueDate ?? null,
      body.startDate ?? "",
      body.endDate ?? "",
      body.months ?? 6,
      body.children ?? 1,
      status,
      body.note ?? null,
    )
    .run();
  return json({ id: res.meta.last_row_id }, 201);
}

/** PUT /api/maternity/:id — cập nhật hồ sơ thai kỳ. */
export async function updateMaternity(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<MaternityBody>(request);
  const map: Record<string, unknown> = {
    notified_date: body.notifiedDate,
    due_date: body.dueDate,
    start_date: body.startDate,
    end_date: body.endDate,
    months: body.months,
    children: body.children,
    status: body.status && STATUSES.has(body.status) ? body.status : undefined,
    note: body.note,
  };
  const fields: string[] = [];
  const args: unknown[] = [];
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      args.push(v);
    }
  }
  if (!fields.length) return json({ success: true, unchanged: true });
  args.push(id);
  await env.DB.prepare(`UPDATE maternity_leaves SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...args)
    .run();
  return json({ success: true });
}

/** PUT /api/maternity/:id/checkups — ghi đè toàn bộ các lần khám của hồ sơ. */
export async function saveCheckups(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<{ checkups?: CheckupBody[] }>(request);
  const list = Array.isArray(body.checkups) ? body.checkups : [];
  await env.DB.prepare("DELETE FROM prenatal_checkups WHERE maternity_id = ?").bind(id).run();
  // Chỉ lưu lần khám có ngày; tối đa 5 lần theo quy định.
  const valid = list.filter((c) => c.date && c.seq >= 1 && c.seq <= 5).slice(0, 5);
  for (const c of valid) {
    const special = c.special ? 1 : 0;
    const days = c.days ?? (special ? 2 : 1);
    // Đã đính kèm giấy BHXH thì mặc nhiên coi là đã nộp.
    const submitted = c.docKey || c.docSubmitted ? 1 : 0;
    await env.DB.prepare(
      "INSERT INTO prenatal_checkups (maternity_id, seq, checkup_date, days, special, doc_submitted, doc_key, doc_name, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(id, c.seq, c.date ?? null, days, special, submitted, c.docKey ?? null, c.docName ?? null, c.note ?? null)
      .run();
  }
  return json({ success: true, count: valid.length });
}

/** Điều hướng phụ: tách id từ /api/maternity/:id[/checkups]. */
export function maternityId(pathname: string): string | null {
  return parseIdFromPath(pathname, "/api/maternity/");
}
