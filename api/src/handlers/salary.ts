import type { Env } from "../middleware/auth";
import { json, error, getParams, readJson } from "../utils";

const COMP_FIELDS: Record<string, string> = {
  base_salary: "base_salary",
  allowance: "allowance",
  responsibility_salary: "responsibility_salary",
  gas_allowance: "gas_allowance",
  attendance_bonus: "attendance_bonus",
  union_dues: "union_dues",
  dependents: "dependents",
  advance: "advance",
  advance_ck: "advance_ck",
  advance_tm: "advance_tm",
  company_debt: "company_debt",
};

const ATT_FIELDS: Record<string, string> = {
  std_days: "std_days",
  actual_days: "actual_days",
  pn: "pn",
  gas_days: "gas_days",
  ot_weekday_hours: "ot_weekday_hours",
  ot_sunday_hours: "ot_sunday_hours",
  ot_holiday_hours: "ot_holiday_hours",
  ot_night_hours: "ot_night_hours",
  meal_allowance: "meal_allowance",
  night_allowance: "night_allowance",
  bonus: "bonus",
};

const INS_FIELDS: Record<string, string> = {
  bhxh_manual: "bhxh_manual",
  bhyt_manual: "bhyt_manual",
  bhtn_manual: "bhtn_manual",
};

interface SalaryUpdateBody {
  period?: string;
  field?: string;
  value?: number | string | null;
}

export async function getSalary(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT e.id as employee_id, e.code, e.name, e.position, e.department_id, e.bank,
            d.name as department_name,
            c.pay_method, c.merge_into,
            c.base_salary, c.allowance, c.responsibility_salary,
            c.gas_allowance, c.attendance_bonus, c.union_dues,
            c.dependents, c.kpi_bonus, c.hot_bonus, c.advance,
            c.advance_ck, c.advance_tm, c.company_debt,
            a.std_days, a.actual_days, a.pn, a.gas_days, a.leave_days,
            a.overtime_hours, a.ot_weekday_hours, a.ot_sunday_hours,
            a.ot_holiday_hours, a.ot_night_hours,
            a.meal_allowance, a.night_allowance, a.bonus,
            ins.salary_base as ins_salary_base,
            ins.bhxh_amount, ins.bhyt_amount, ins.bhtn_amount,
            ins.bhxh_manual, ins.bhyt_manual, ins.bhtn_manual,
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

export async function updateSalaryCell(request: Request, env: Env, employeeId: string): Promise<Response> {
  const body = await readJson<SalaryUpdateBody>(request);
  const period = String(body.period ?? "").trim();
  const field = String(body.field ?? "").trim();
  if (!period) return error("Thiếu kỳ lương", 400);
  if (!field) return error("Thiếu cột cần sửa", 400);

  const value = Number(String(body.value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(value)) return error("Giá trị không hợp lệ", 400);

  const employee = await env.DB.prepare("SELECT id FROM employees WHERE id = ?")
    .bind(employeeId)
    .first<{ id: number }>();
  if (!employee) return error("Không tìm thấy nhân viên", 404);

  const compCol = COMP_FIELDS[field];
  if (compCol) {
    await env.DB.prepare("INSERT OR IGNORE INTO compensation (employee_id) VALUES (?)")
      .bind(employeeId)
      .run();
    if (field === "advance") {
      await env.DB.prepare("UPDATE compensation SET advance = ?, advance_ck = ?, advance_tm = 0 WHERE employee_id = ?")
        .bind(value, value, employeeId)
        .run();
      return json({ success: true });
    }
    await env.DB.prepare(`UPDATE compensation SET ${compCol} = ? WHERE employee_id = ?`)
      .bind(value, employeeId)
      .run();
    if (field === "advance_ck" || field === "advance_tm") {
      await env.DB.prepare("UPDATE compensation SET advance = COALESCE(advance_ck, 0) + COALESCE(advance_tm, 0) WHERE employee_id = ?")
        .bind(employeeId)
        .run();
    }
    return json({ success: true });
  }

  const attCol = ATT_FIELDS[field];
  if (attCol) {
    await env.DB.prepare(
      `INSERT INTO attendance (employee_id, period, std_days, actual_days)
       VALUES (?, ?, 26, 0)
       ON CONFLICT(employee_id, period) DO NOTHING`,
    )
      .bind(employeeId, period)
      .run();
    await env.DB.prepare(`UPDATE attendance SET ${attCol} = ? WHERE employee_id = ? AND period = ?`)
      .bind(value, employeeId, period)
      .run();
    return json({ success: true });
  }

  const insCol = INS_FIELDS[field];
  if (insCol) {
    await env.DB.prepare("INSERT OR IGNORE INTO insurance (employee_id) VALUES (?)")
      .bind(employeeId)
      .run();
    await env.DB.prepare(`UPDATE insurance SET ${insCol} = ? WHERE employee_id = ?`)
      .bind(value, employeeId)
      .run();
    return json({ success: true });
  }

  return error("Cột này chưa hỗ trợ sửa thủ công", 400);
}

/**
 * GET /api/salary/me?period=YYYY-MM — phiếu lương của CHÍNH người đăng nhập.
 * Tự phục vụ (mọi vai trò), chỉ trả đúng dòng của nhân viên gắn với tài khoản.
 */
export async function getMySalary(request: Request, env: Env, userId: number): Promise<Response> {
  const params = getParams(new URL(request.url));
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const acc = await env.DB.prepare("SELECT employee_id FROM users WHERE id = ?")
    .bind(userId)
    .first<{ employee_id: number | null }>();
  if (!acc?.employee_id) return error("Tài khoản chưa gắn nhân viên", 404);

  const row = await env.DB.prepare(
    `SELECT e.id as employee_id, e.code, e.name, e.position, e.department_id, e.bank,
            d.name as department_name,
            c.pay_method, c.merge_into,
            c.base_salary, c.allowance, c.responsibility_salary,
            c.gas_allowance, c.attendance_bonus, c.union_dues,
            c.dependents, c.kpi_bonus, c.hot_bonus, c.advance,
            c.advance_ck, c.advance_tm, c.company_debt,
            a.std_days, a.actual_days, a.pn, a.gas_days, a.leave_days,
            a.overtime_hours, a.ot_weekday_hours, a.ot_sunday_hours,
            a.ot_holiday_hours, a.ot_night_hours,
            a.meal_allowance, a.night_allowance, a.bonus,
            ins.salary_base as ins_salary_base,
            ins.bhxh_amount, ins.bhyt_amount, ins.bhtn_amount,
            ins.bhxh_manual, ins.bhyt_manual, ins.bhtn_manual,
            k.score as kpi_score, k.rank as kpi_rank
     FROM employees e
     LEFT JOIN compensation c ON c.employee_id = e.id
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.period = ?
     LEFT JOIN insurance ins ON ins.employee_id = e.id
     LEFT JOIN kpi_scores k ON k.employee_id = e.id AND k.period = ?
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.id = ?`,
  )
    .bind(period, period, acc.employee_id)
    .first();

  return json({ data: row ?? null, period });
}
