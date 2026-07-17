import type { Env } from "../middleware/auth";
import { json, error, getParams, readJson } from "../utils";

export async function getKpi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT k.*, e.name as employee_name, e.code as employee_code,
            d.name as department_name
     FROM kpi_scores k
     JOIN employees e ON e.id = k.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE k.period = ?
     ORDER BY k.score DESC`
  )
    .bind(period)
    .all();

  return json({ data: results, period });
}

export async function createKpi(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    employee_id: number;
    period: string;
    bc: number;
    ns: number;
    cl: number;
    dg: number;
    note?: string;
  }>(request);

  if (!body.employee_id || !body.period) {
    return error("Thiếu employee_id hoặc period", 400);
  }

  const bc = body.bc ?? 0;
  const ns = body.ns ?? 0;
  const cl = body.cl ?? 0;
  const dg = body.dg ?? 0;
  const score = bc + ns + cl + dg;

  let rank: string;
  if (score >= 93) rank = "Xuất sắc";
  else if (score >= 90) rank = "Tốt";
  else if (score >= 83) rank = "Khá";
  else if (score >= 70) rank = "Đạt";
  else rank = "Cần cải thiện";

  const existing = await env.DB.prepare(
    `SELECT id FROM kpi_scores WHERE employee_id = ? AND period = ?`
  )
    .bind(body.employee_id, body.period)
    .first();

  if (existing) {
    return error("Bản ghi KPI đã tồn tại cho nhân viên này trong kỳ này", 409);
  }

  const result = await env.DB.prepare(
    `INSERT INTO kpi_scores (employee_id, period, score, rank, bc, ns, cl, dg, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(body.employee_id, body.period, score, rank, bc, ns, cl, dg, body.note ?? null)
    .run();

  return json({ id: result.meta.last_row_id, score, rank }, 201);
}

export async function updateKpi(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<{
    bc?: number;
    ns?: number;
    cl?: number;
    dg?: number;
    note?: string;
  }>(request);

  const row = await env.DB.prepare(`SELECT * FROM kpi_scores WHERE id = ?`).bind(id).first();
  if (!row) return error("Không tìm thấy bản ghi KPI", 404);

  const bc = body.bc ?? (row.bc as number);
  const ns = body.ns ?? (row.ns as number);
  const cl = body.cl ?? (row.cl as number);
  const dg = body.dg ?? (row.dg as number);
  const score = bc + ns + cl + dg;

  let rank: string;
  if (score >= 93) rank = "Xuất sắc";
  else if (score >= 90) rank = "Tốt";
  else if (score >= 83) rank = "Khá";
  else if (score >= 70) rank = "Đạt";
  else rank = "Cần cải thiện";

  await env.DB.prepare(
    `UPDATE kpi_scores SET bc=?, ns=?, cl=?, dg=?, score=?, rank=?, note=?, is_edited=1
     WHERE id = ?`
  )
    .bind(bc, ns, cl, dg, score, rank, body.note ?? (row.note as string | null), id)
    .run();

  return json({ success: true, score, rank });
}

export async function signKpi(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<{ level: 1 | 2 }>(request);
  if (body.level !== 1 && body.level !== 2) {
    return error("level phải là 1 (tổ trưởng) hoặc 2 (BGĐ/HR)", 400);
  }

  const row = await env.DB.prepare(`SELECT * FROM kpi_scores WHERE id = ?`).bind(id).first();
  if (!row) return error("Không tìm thấy bản ghi KPI", 404);

  const col = body.level === 1 ? "signed_l1" : "signed_l2";

  if (body.level === 2 && !(row.signed_l1 as number)) {
    return error("Cần ký duyệt tổ trưởng trước", 400);
  }

  await env.DB.prepare(`UPDATE kpi_scores SET ${col} = 1 WHERE id = ?`).bind(id).run();

  return json({ success: true });
}
