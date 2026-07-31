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
  otWeekdayHours?: number;
  otSundayHours?: number;
  otHolidayHours?: number;
  gasDays?: number;
  mealAllowance?: number;
  locked?: boolean;
}

interface AttendanceRow {
  locked: number;
  std_days: number;
  actual_days: number;
  pn: number;
  pb: number;
  vr: number;
  ot_weekday_hours: number | null;
  ot_sunday_hours: number | null;
  ot_holiday_hours: number | null;
  gas_days: number | null;
  meal_allowance: number | null;
}

/**
 * Điều chỉnh chấm công 1 dòng. Cho phép sửa mọi số liệu (công, nghỉ phép, tăng ca,
 * phụ cấp) để HR bổ sung khi NV quên chấm OT, chấm trễ, hoặc thiếu giờ ra.
 * KP và Tổng OT được TỰ TÍNH LẠI từ các thành phần để luôn khớp bảng lương:
 *   - KP      = max(0, Công chuẩn − N.C − PN − PB − VR)
 *   - Tổng OT = OT ngày thường + OT chủ nhật + OT lễ
 */
export async function updateAttendance(request: Request, env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM attendance WHERE id = ?")
    .bind(id)
    .first<AttendanceRow>();
  if (!existing) return error("Không tìm thấy bản ghi chấm công", 404);

  const body = await readJson<AttendanceUpdateBody>(request);

  // Thao tác khoá/mở khoá kỳ: chỉ đổi trạng thái, không đụng số liệu.
  if (body.locked !== undefined && Object.keys(body).length === 1) {
    await env.DB.prepare("UPDATE attendance SET locked = ? WHERE id = ?")
      .bind(body.locked ? 1 : 0, id)
      .run();
    return json({ success: true });
  }

  if (existing.locked) return error("Kỳ chấm công đã bị khóa", 423);

  // Trường nào không gửi thì giữ nguyên giá trị hiện có.
  const keep = (v: number | undefined, cur: number | null | undefined): number =>
    v === undefined || v === null || Number.isNaN(Number(v)) ? Number(cur ?? 0) : Number(v);

  const std = keep(body.stdDays, existing.std_days);
  const nc = keep(body.actualDays, existing.actual_days);
  const pn = keep(body.pn, existing.pn);
  const pb = keep(body.pb, existing.pb);
  const vr = keep(body.vr, existing.vr);
  const otW = keep(body.otWeekdayHours, existing.ot_weekday_hours);
  const otS = keep(body.otSundayHours, existing.ot_sunday_hours);
  const otH = keep(body.otHolidayHours, existing.ot_holiday_hours);
  const gas = keep(body.gasDays, existing.gas_days);
  const meal = keep(body.mealAllowance, existing.meal_allowance);

  const kp = Math.max(0, +(std - nc - pn - pb - vr).toFixed(2));
  const otTotal = +(otW + otS + otH).toFixed(2);

  await env.DB.prepare(
    `UPDATE attendance SET
       std_days = ?, actual_days = ?, pn = ?, pb = ?, vr = ?, kp = ?,
       ot_weekday_hours = ?, ot_sunday_hours = ?, ot_holiday_hours = ?, overtime_hours = ?,
       gas_days = ?, meal_allowance = ?, is_edited = 1
     WHERE id = ?`,
  )
    .bind(std, nc, pn, pb, vr, kp, otW, otS, otH, otTotal, gas, meal, id)
    .run();

  return json({ success: true });
}

/** Danh sách các kỳ (period) đã có dữ liệu chấm công, mới nhất trước. */
export async function listAttendancePeriods(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT period FROM attendance ORDER BY period DESC",
  ).all<{ period: string }>();
  return json({ data: results.map((r) => r.period) });
}

interface ImportRow {
  code?: string;
  name?: string;
  stdDays?: number;
  actualDays?: number;
  pn?: number;
  pb?: number;
  vr?: number;
  overtimeHours?: number;
  otWeekdayHours?: number;
  otSundayHours?: number;
  otHolidayHours?: number;
  gasDays?: number;
  mealAllowance?: number;
}

/**
 * Nhập chấm công hàng loạt cho 1 kỳ từ file Excel (đã parse ở client).
 * Khớp nhân viên theo mã thẻ, rồi theo tên (bỏ khoảng trắng, không phân biệt hoa/thường).
 * PN/PB/VR do phân hệ nghỉ phép/HR quản lý — KHÔNG ghi đè nếu đã có; KP tính lại
 * theo công thức file: KP = công chuẩn − NC − PN − PB − VR.
 */
export async function importAttendance(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ period?: string; rows?: ImportRow[] }>(request);
  const period = (body.period || "").trim();
  if (!/^\d{4}-\d{2}$/.test(period)) return error("Thiếu hoặc sai kỳ (định dạng YYYY-MM)", 400);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return error("Không có dòng dữ liệu để nhập", 400);

  const { results: emps } = await env.DB.prepare("SELECT id, code, name FROM employees").all<{
    id: number;
    code: string;
    name: string;
  }>();
  const byCode = new Map(emps.map((e) => [String(e.code).trim(), e.id]));
  const byName = new Map(emps.map((e) => [String(e.name).trim().toLowerCase(), e.id]));

  let imported = 0;
  const unmatched: string[] = [];

  for (const r of rows) {
    let empId: number | undefined;
    const code = r.code ? String(r.code).trim() : "";
    const name = r.name ? String(r.name).trim().toLowerCase() : "";
    if (code && byCode.has(code)) empId = byCode.get(code);
    else if (name && byName.has(name)) empId = byName.get(name);
    if (!empId) {
      unmatched.push(r.name || r.code || "?");
      continue;
    }

    // Giữ PN/PB/VR hiện có (do HR/nghỉ phép nhập); import không mang các giá trị này.
    const ex = await env.DB.prepare(
      "SELECT pn, pb, vr FROM attendance WHERE employee_id = ? AND period = ?",
    )
      .bind(empId, period)
      .first<{ pn: number; pb: number; vr: number }>();
    const pn = ex?.pn ?? 0;
    const pb = ex?.pb ?? 0;
    const vr = ex?.vr ?? 0;

    const std = r.stdDays ?? 26;
    const nc = r.actualDays ?? 0;
    const kp = Math.max(0, +(std - nc - pn - pb - vr).toFixed(2));
    const otW = r.otWeekdayHours ?? 0;
    const otS = r.otSundayHours ?? 0;
    const otH = r.otHolidayHours ?? 0;
    const otTotal = r.overtimeHours ?? otW + otS + otH;

    await env.DB.prepare(
      `INSERT INTO attendance
         (employee_id, period, std_days, actual_days, pn, pb, vr, kp,
          overtime_hours, ot_weekday_hours, ot_sunday_hours, ot_holiday_hours,
          gas_days, meal_allowance, is_edited)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(employee_id, period) DO UPDATE SET
         std_days = excluded.std_days,
         actual_days = excluded.actual_days,
         kp = excluded.kp,
         overtime_hours = excluded.overtime_hours,
         ot_weekday_hours = excluded.ot_weekday_hours,
         ot_sunday_hours = excluded.ot_sunday_hours,
         ot_holiday_hours = excluded.ot_holiday_hours,
         gas_days = excluded.gas_days,
         meal_allowance = excluded.meal_allowance,
         is_edited = 0`,
    )
      .bind(empId, period, std, nc, pn, pb, vr, kp, otTotal, otW, otS, otH, r.gasDays ?? 0, r.mealAllowance ?? 0)
      .run();
    imported++;
  }

  return json({ success: true, imported, unmatched });
}
