import type { Env } from "../middleware/auth";
import { json, error, getParams } from "../utils";

export async function getSalary(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT e.id as employee_id, e.code, e.name, c.base_salary, c.allowance, c.dependents,
            a.overtime_hours, ins.salary_base as ins_salary_base
     FROM employees e
     LEFT JOIN compensation c ON c.employee_id = e.id
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.period = ?
     LEFT JOIN insurance ins ON ins.employee_id = e.id
     WHERE e.status = 'Đang làm việc'
     ORDER BY e.code`
  )
    .bind(period)
    .all();

  return json({ data: results, period });
}
