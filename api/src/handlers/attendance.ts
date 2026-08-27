import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";
import { replaceOvertimeDaily, type OtDay } from "./overtime";

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
  employeeId?: number;
  period?: string;
  stdDays?: number;
  actualDays?: number;
  pn?: number;
  pb?: number;
  vr?: number;
  pc?: number;
  pts?: number;
  pt?: number;
  tnld?: number;
  otWeekdayHours?: number;
  otSundayHours?: number;
  otHolidayHours?: number;
  gasDays?: number;
  mealAllowance?: number;
  locked?: boolean;
}

interface AttendanceRow {
  id: number;
  locked: number;
  std_days: number;
  actual_days: number;
  pn: number;
  pb: number;
  vr: number;
  pc: number | null;
  pts: number | null;
  pt: number | null;
  tnld: number | null;
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
  const body = await readJson<AttendanceUpdateBody>(request);

  // Tìm bản ghi theo id; nếu không có (id cũ/không khớp), tra theo nhân viên + kỳ.
  let existing = await env.DB.prepare("SELECT * FROM attendance WHERE id = ?")
    .bind(id)
    .first<AttendanceRow>();
  if (!existing && body.employeeId && body.period) {
    existing = await env.DB.prepare("SELECT * FROM attendance WHERE employee_id = ? AND period = ?")
      .bind(body.employeeId, body.period)
      .first<AttendanceRow>();
  }

  // Thao tác khoá/mở khoá kỳ: chỉ đổi trạng thái, không đụng số liệu.
  if (body.locked !== undefined && Object.keys(body).length === 1) {
    if (!existing) return error("Không tìm thấy bản ghi chấm công", 404);
    await env.DB.prepare("UPDATE attendance SET locked = ? WHERE id = ?")
      .bind(body.locked ? 1 : 0, existing.id)
      .run();
    return json({ success: true });
  }

  if (existing?.locked) return error("Kỳ chấm công đã bị khóa", 423);

  // Trường nào không gửi thì giữ nguyên giá trị hiện có (bản ghi mới → mặc định 0).
  const keep = (v: number | undefined, cur: number | null | undefined): number =>
    v === undefined || v === null || Number.isNaN(Number(v)) ? Number(cur ?? 0) : Number(v);

  const std = keep(body.stdDays, existing?.std_days ?? 26);
  const nc = keep(body.actualDays, existing?.actual_days);
  const pn = keep(body.pn, existing?.pn);
  const pb = keep(body.pb, existing?.pb);
  const vr = keep(body.vr, existing?.vr);
  const pc = keep(body.pc, existing?.pc);
  const pts = keep(body.pts, existing?.pts);
  const pt = keep(body.pt, existing?.pt);
  const tnld = keep(body.tnld, existing?.tnld);
  const otW = keep(body.otWeekdayHours, existing?.ot_weekday_hours);
  const otS = keep(body.otSundayHours, existing?.ot_sunday_hours);
  const otH = keep(body.otHolidayHours, existing?.ot_holiday_hours);
  const gas = keep(body.gasDays, existing?.gas_days);
  const meal = keep(body.mealAllowance, existing?.meal_allowance);

  // KP = phần vắng không phép còn lại sau khi trừ mọi loại phép có lý do.
  const kp = Math.max(0, +(std - nc - pn - pb - vr - pc - pts - pt - tnld).toFixed(2));
  const otTotal = +(otW + otS + otH).toFixed(2);
  // Ngày phép hưởng 100% lương (bảng lương trả theo leave_days): PC + PT + TNLĐ.
  // PTS (thai sản) không hưởng lương → không tính vào leave_days.
  const leaveDays = +(pc + pt + tnld).toFixed(2);

  if (existing) {
    await env.DB.prepare(
      `UPDATE attendance SET
         std_days = ?, actual_days = ?, pn = ?, pb = ?, vr = ?,
         pc = ?, pts = ?, pt = ?, tnld = ?, kp = ?, leave_days = ?,
         ot_weekday_hours = ?, ot_sunday_hours = ?, ot_holiday_hours = ?, overtime_hours = ?,
         gas_days = ?, meal_allowance = ?, is_edited = 1
       WHERE id = ?`,
    )
      .bind(std, nc, pn, pb, vr, pc, pts, pt, tnld, kp, leaveDays, otW, otS, otH, otTotal, gas, meal, existing.id)
      .run();
    return json({ success: true });
  }

  // Chưa có bản ghi nào → tạo bản ghi điều chỉnh mới cho nhân viên + kỳ (upsert).
  if (!body.employeeId || !body.period) {
    return error("Không tìm thấy bản ghi chấm công (thiếu nhân viên/kỳ để tạo mới)", 404);
  }
  await env.DB.prepare(
    `INSERT INTO attendance
       (employee_id, period, std_days, actual_days, pn, pb, vr, pc, pts, pt, tnld, kp, leave_days,
        ot_weekday_hours, ot_sunday_hours, ot_holiday_hours, overtime_hours, gas_days, meal_allowance, is_edited)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(employee_id, period) DO UPDATE SET
       std_days = excluded.std_days, actual_days = excluded.actual_days, pn = excluded.pn, pb = excluded.pb, vr = excluded.vr,
       pc = excluded.pc, pts = excluded.pts, pt = excluded.pt, tnld = excluded.tnld, kp = excluded.kp, leave_days = excluded.leave_days,
       ot_weekday_hours = excluded.ot_weekday_hours, ot_sunday_hours = excluded.ot_sunday_hours, ot_holiday_hours = excluded.ot_holiday_hours,
       overtime_hours = excluded.overtime_hours, gas_days = excluded.gas_days, meal_allowance = excluded.meal_allowance, is_edited = 1`,
  )
    .bind(body.employeeId, body.period, std, nc, pn, pb, vr, pc, pts, pt, tnld, kp, leaveDays, otW, otS, otH, otTotal, gas, meal)
    .run();

  return json({ success: true, created: true });
}

/** Danh sách các kỳ (period) đã có dữ liệu chấm công, mới nhất trước. */
export async function listAttendancePeriods(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT period FROM attendance ORDER BY period DESC",
  ).all<{ period: string }>();
  return json({ data: results.map((r) => r.period) });
}

// Loại đơn nghỉ → cột chấm công tương ứng. Thai sản (TS) theo dõi riêng, không map.
const LEAVE_COL: Record<string, "pn" | "pb" | "vr" | "pc" | "pt" | "tnld"> = {
  PN: "pn", PB: "pb", VR: "vr", PC: "pc", PT: "pt", TNLD: "tnld",
};

/**
 * GET /api/attendance/leave-suggestions?period=YYYY-MM
 * Các đơn nghỉ ĐÃ DUYỆT trong kỳ nhưng CHƯA áp vào bảng chấm công — để HR xác nhận.
 */
export async function listLeaveSuggestions(request: Request, env: Env): Promise<Response> {
  const params = getParams(new URL(request.url));
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT lr.id, lr.employee_id, lr.type_code, lr.days, lr.from_date, lr.to_date,
            e.name AS employee_name, e.code AS employee_code,
            a.id AS attendance_id, a.locked AS attendance_locked
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     LEFT JOIN attendance a ON a.employee_id = lr.employee_id AND a.period = ?
     WHERE lr.status = 'approved'
       AND COALESCE(lr.applied, 0) = 0
       AND strftime('%Y-%m', lr.from_date) = ?
       AND lr.type_code IN ('PN','PB','VR','PC','PT','TNLD')
     ORDER BY e.code`,
  )
    .bind(period, period)
    .all();

  return json({ data: results, period });
}

/**
 * POST /api/attendance/apply-leave { leaveId }
 * Cộng số ngày của đơn nghỉ đã duyệt vào đúng cột (PN/PB/VR/PC/PT/TNLĐ) của dòng
 * chấm công kỳ tương ứng, tính lại KP & ngày phép 100%, rồi đánh dấu đơn đã áp.
 */
export async function applyLeaveToAttendance(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ leaveId?: number }>(request);
  if (!body.leaveId) return error("Thiếu leaveId", 400);

  const leave = await env.DB.prepare(
    "SELECT * FROM leave_requests WHERE id = ?",
  )
    .bind(body.leaveId)
    .first<{ id: number; employee_id: number; type_code: string; days: number; from_date: string; status: string; applied: number | null }>();
  if (!leave) return error("Không tìm thấy đơn nghỉ", 404);
  if (leave.status !== "approved") return error("Đơn chưa được duyệt xong", 409);
  if (leave.applied) return json({ success: true, alreadyApplied: true });
  const col = LEAVE_COL[leave.type_code];
  if (!col) return error("Loại nghỉ này không áp vào chấm công", 400);

  const period = leave.from_date.slice(0, 7); // YYYY-MM
  const row = await env.DB.prepare(
    "SELECT * FROM attendance WHERE employee_id = ? AND period = ?",
  )
    .bind(leave.employee_id, period)
    .first<AttendanceRow & { id: number }>();
  if (!row) return error(`Chưa có dòng chấm công kỳ ${period} cho nhân viên này. Hãy nhập chấm công trước.`, 409);
  if (row.locked) return error("Kỳ chấm công đã bị khóa", 423);

  const cur = {
    pn: Number(row.pn ?? 0), pb: Number(row.pb ?? 0), vr: Number(row.vr ?? 0),
    pc: Number(row.pc ?? 0), pts: Number(row.pts ?? 0), pt: Number(row.pt ?? 0), tnld: Number(row.tnld ?? 0),
  };
  cur[col] = +(cur[col] + Number(leave.days)).toFixed(2);

  const std = Number(row.std_days ?? 0);
  const nc = Number(row.actual_days ?? 0);
  const kp = Math.max(0, +(std - nc - cur.pn - cur.pb - cur.vr - cur.pc - cur.pts - cur.pt - cur.tnld).toFixed(2));
  const leaveDays = +(cur.pc + cur.pt + cur.tnld).toFixed(2);

  await env.DB.prepare(
    `UPDATE attendance SET pn = ?, pb = ?, vr = ?, pc = ?, pts = ?, pt = ?, tnld = ?, kp = ?, leave_days = ?, is_edited = 1 WHERE id = ?`,
  )
    .bind(cur.pn, cur.pb, cur.vr, cur.pc, cur.pts, cur.pt, cur.tnld, kp, leaveDays, row.id)
    .run();
  await env.DB.prepare("UPDATE leave_requests SET applied = 1 WHERE id = ?").bind(leave.id).run();

  return json({ success: true, column: col, days: leave.days, period });
}

/**
 * GET /api/attendance/checkup-suggestions?period=YYYY-MM
 * Các lần khám thai đã ghi trong kỳ nhưng CHƯA áp vào cột PTS (thai sản) của
 * bảng chấm công — để HR xác nhận. Chỉ HR/super (gác ở index.ts).
 */
export async function listCheckupSuggestions(request: Request, env: Env): Promise<Response> {
  const params = getParams(new URL(request.url));
  const period = params.period;
  if (!period) return error("Thiếu tham số period (VD: 2026-06)", 400);

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.seq, c.checkup_date, c.days,
            m.employee_id, e.name AS employee_name, e.code AS employee_code,
            a.id AS attendance_id, a.locked AS attendance_locked
     FROM prenatal_checkups c
     JOIN maternity_leaves m ON m.id = c.maternity_id
     JOIN employees e ON e.id = m.employee_id
     LEFT JOIN attendance a ON a.employee_id = m.employee_id AND a.period = ?
     WHERE c.checkup_date IS NOT NULL AND c.checkup_date != ''
       AND COALESCE(c.applied, 0) = 0
       AND strftime('%Y-%m', c.checkup_date) = ?
     ORDER BY e.code, c.seq`,
  )
    .bind(period, period)
    .all();

  return json({ data: results, period });
}

/**
 * POST /api/attendance/apply-checkup { checkupId }
 * Cộng số ngày nghỉ khám thai vào cột PTS của dòng chấm công kỳ tương ứng, tính
 * lại KP, rồi đánh dấu lần khám đã áp. Mặc định quyền HR (gác ở index.ts).
 */
export async function applyCheckupToAttendance(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ checkupId?: number }>(request);
  if (!body.checkupId) return error("Thiếu checkupId", 400);

  const c = await env.DB.prepare(
    `SELECT c.id, c.days, c.checkup_date, c.applied, m.employee_id
     FROM prenatal_checkups c JOIN maternity_leaves m ON m.id = c.maternity_id
     WHERE c.id = ?`,
  )
    .bind(body.checkupId)
    .first<{ id: number; days: number; checkup_date: string | null; applied: number | null; employee_id: number }>();
  if (!c) return error("Không tìm thấy lần khám", 404);
  if (!c.checkup_date) return error("Lần khám chưa có ngày", 400);
  if (c.applied) return json({ success: true, alreadyApplied: true });

  const period = c.checkup_date.slice(0, 7);
  const row = await env.DB.prepare(
    "SELECT * FROM attendance WHERE employee_id = ? AND period = ?",
  )
    .bind(c.employee_id, period)
    .first<AttendanceRow & { id: number }>();
  if (!row) return error(`Chưa có dòng chấm công kỳ ${period} cho nhân viên này. Hãy nhập chấm công trước.`, 409);
  if (row.locked) return error("Kỳ chấm công đã bị khóa", 423);

  const pts = +((Number(row.pts ?? 0)) + Number(c.days)).toFixed(2);
  const std = Number(row.std_days ?? 0);
  const nc = Number(row.actual_days ?? 0);
  const pn = Number(row.pn ?? 0), pb = Number(row.pb ?? 0), vr = Number(row.vr ?? 0);
  const pc = Number(row.pc ?? 0), pt = Number(row.pt ?? 0), tnld = Number(row.tnld ?? 0);
  const kp = Math.max(0, +(std - nc - pn - pb - vr - pc - pts - pt - tnld).toFixed(2));

  await env.DB.prepare("UPDATE attendance SET pts = ?, kp = ?, is_edited = 1 WHERE id = ?")
    .bind(pts, kp, row.id)
    .run();
  await env.DB.prepare("UPDATE prenatal_checkups SET applied = 1 WHERE id = ?").bind(c.id).run();

  return json({ success: true, column: "pts", days: c.days, period });
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
  otDaily?: OtDay[];
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

    // Giữ các loại phép hiện có (do HR/nghỉ phép nhập); import không mang giá trị này.
    const ex = await env.DB.prepare(
      "SELECT pn, pb, vr, pc, pts, pt, tnld FROM attendance WHERE employee_id = ? AND period = ?",
    )
      .bind(empId, period)
      .first<{ pn: number; pb: number; vr: number; pc: number; pts: number; pt: number; tnld: number }>();
    const pn = ex?.pn ?? 0;
    const pb = ex?.pb ?? 0;
    const vr = ex?.vr ?? 0;
    const pc = ex?.pc ?? 0;
    const pts = ex?.pts ?? 0;
    const pt = ex?.pt ?? 0;
    const tnld = ex?.tnld ?? 0;

    const std = r.stdDays ?? 26;
    const nc = r.actualDays ?? 0;
    const kp = Math.max(0, +(std - nc - pn - pb - vr - pc - pts - pt - tnld).toFixed(2));
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

    // Chi tiết tăng ca theo ngày (file gốc có sẵn) — ghi đè để mở lưới ngày là
    // thấy sẵn số liệu; nhập lại cùng kỳ sẽ reset chi tiết cũ.
    await replaceOvertimeDaily(env, empId, period, Array.isArray(r.otDaily) ? r.otDaily : []);
    imported++;
  }

  return json({ success: true, imported, unmatched });
}
