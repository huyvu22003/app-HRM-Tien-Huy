import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";

export async function listAttendance(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT a.*, e.name as employee_name, e.code as employee_code
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     WHERE a.period = ?
     ORDER BY e.code`
  )
    .bind(period)
    .all();

  return json({ data: results, period });
}

interface AttendanceUpdateBody {
  stdDays?: number;
  actualDays?: number;
  pn?: number;
  pb?: number;
  vr?: number;
  kp?: number;
  overtimeHours?: number;
  locked?: boolean;
}

export async function updateAttendance(request: Request, env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM attendance WHERE id = ?").bind(id).first<{ locked: number }>();
  if (!existing) return error("Không tìm thấy bản ghi chấm công", 404);
  if (existing.locked) return error("Kỳ chấm công đã bị khóa", 423);

  const body = await readJson<AttendanceUpdateBody>(request);
  const fields: string[] = [];
  const args: unknown[] = [];
  const map: Record<string, unknown> = {
    std_days: body.stdDays,
    actual_days: body.actualDays,
    pn: body.pn,
    pb: body.pb,
    vr: body.vr,
    kp: body.kp,
    overtime_hours: body.overtimeHours,
    locked: body.locked === undefined ? undefined : body.locked ? 1 : 0,
  };

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      args.push(value);
    }
  }

  if (fields.length === 0) return json({ success: true, unchanged: true });

  fields.push("is_edited = 1");
  args.push(id);

  await env.DB.prepare(`UPDATE attendance SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...args)
    .run();

  return json({ success: true });
}
