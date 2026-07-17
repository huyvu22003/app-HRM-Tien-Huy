import type { Env } from "../middleware/auth";
import { json, error, getParams, readJson } from "../utils";

export async function listRewards(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;

  let sql = `SELECT r.*, e.name as employee_name, e.code as employee_code,
                    u1.phone as proposed_by_name, u2.phone as approved_by_name
             FROM rewards r
             JOIN employees e ON e.id = r.employee_id
             LEFT JOIN users u1 ON u1.id = r.proposed_by
             LEFT JOIN users u2 ON u2.id = r.approved_by`;
  const binds: unknown[] = [];

  if (period) {
    sql += ` WHERE r.period = ?`;
    binds.push(period);
  }
  sql += ` ORDER BY r.created_at DESC`;

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ data: results });
}

export async function createReward(request: Request, env: Env, userId: number): Promise<Response> {
  const body = await readJson<{
    employee_id: number;
    period: string;
    type: string;
    amount?: number;
    reason?: string;
  }>(request);

  if (!body.employee_id || !body.period || !body.type) {
    return error("Thiếu employee_id, period hoặc type", 400);
  }

  const validTypes = ["kpi_bonus", "hot_bonus", "recognition"];
  if (!validTypes.includes(body.type)) {
    return error("type phải là kpi_bonus, hot_bonus hoặc recognition", 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO rewards (employee_id, period, type, amount, reason, proposed_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(body.employee_id, body.period, body.type, body.amount ?? 0, body.reason ?? null, userId)
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function updateReward(request: Request, env: Env, id: string, userId: number): Promise<Response> {
  const body = await readJson<{
    action: "approve" | "reject";
  }>(request);

  if (body.action !== "approve" && body.action !== "reject") {
    return error("action phải là approve hoặc reject", 400);
  }

  const row = await env.DB.prepare(`SELECT * FROM rewards WHERE id = ?`).bind(id).first();
  if (!row) return error("Không tìm thấy đề xuất khen thưởng", 404);
  if (row.status !== "pending") return error("Đề xuất đã được xử lý", 400);

  const status = body.action === "approve" ? "approved" : "rejected";
  await env.DB.prepare(
    `UPDATE rewards SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`
  )
    .bind(status, userId, id)
    .run();

  return json({ success: true, status });
}

export async function listImprovementPlans(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;

  let sql = `SELECT ip.*, e.name as employee_name, e.code as employee_code
             FROM improvement_plans ip
             JOIN employees e ON e.id = ip.employee_id`;
  const binds: unknown[] = [];

  if (period) {
    sql += ` WHERE ip.period = ?`;
    binds.push(period);
  }
  sql += ` ORDER BY ip.created_at DESC`;

  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ data: results });
}

export async function createImprovementPlan(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    employee_id: number;
    period: string;
    kpi_score: number;
    step: string;
    note?: string;
  }>(request);

  if (!body.employee_id || !body.period || !body.step) {
    return error("Thiếu employee_id, period hoặc step", 400);
  }

  const validSteps = ["remind", "training", "commitment"];
  if (!validSteps.includes(body.step)) {
    return error("step phải là remind, training hoặc commitment", 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO improvement_plans (employee_id, period, kpi_score, step, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(employee_id, period) DO UPDATE SET
       kpi_score = excluded.kpi_score,
       step = excluded.step,
       note = excluded.note`
  )
    .bind(body.employee_id, body.period, body.kpi_score ?? 0, body.step, body.note ?? null)
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}
