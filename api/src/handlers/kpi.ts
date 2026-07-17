import type { Env } from "../middleware/auth";
import { json, error, getParams } from "../utils";

export async function getKpi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT k.*, e.name as employee_name, e.code as employee_code
     FROM kpi_scores k
     JOIN employees e ON e.id = k.employee_id
     WHERE k.period = ?
     ORDER BY k.score DESC`
  )
    .bind(period)
    .all();

  return json({ data: results, period });
}
