import type { Env } from "../middleware/auth";
import { json, error, getParams } from "../utils";

export async function getSalary(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT e.id as employee_id, e.code, e.name, e.department_id,
            d.name as department_name,
            c.base_salary, c.allowance, c.responsibility_salary,
            c.gas_allowance, c.attendance_bonus, c.union_dues,
            c.dependents, c.kpi_bonus, c.hot_bonus, c.advance,
            c.advance_ck, c.advance_tm, c.company_debt,
            a.std_days, a.actual_days, a.gas_days, a.leave_days,
            a.overtime_hours, a.ot_weekday_hours, a.ot_sunday_hours,
            a.ot_holiday_hours, a.ot_night_hours,
            a.meal_allowance, a.night_allowance, a.bonus,
            ins.salary_base as ins_salary_base,
            ins.bhxh_amount, ins.bhyt_amount, ins.bhtn_amount,
            k.score as kpi_score, k.rank as kpi_rank
     FROM employees e
     LEFT JOIN compensation c ON c.employee_id = e.id
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.period = ?
     LEFT JOIN insurance ins ON ins.employee_id = e.id
     LEFT JOIN kpi_scores k ON k.employee_id = e.id AND k.period = ?
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.status = 'Đang làm việc'
     ORDER BY e.code`
  )
    .bind(period, period)
    .all();

  return json({ data: results, period });
}
