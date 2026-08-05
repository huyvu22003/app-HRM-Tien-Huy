import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";

const MEAL_LONG = 25000; // buổi OT 2–5h
const MEAL_SHORT = 10000; // buổi OT 1–1.5h

/**
 * Chi tiết tăng ca theo từng ngày. Loại OT (ngày thường / chủ nhật) suy ra từ
 * ngày trong tháng; OT lễ nhập ở mức tổng. Mỗi khi lưới ngày thay đổi (hoặc khi
 * import), app tính lại tổng NT/CN + tiền cơm rồi ghi về bảng attendance để bảng
 * lương luôn khớp.
 *
 * CI không tự chạy migration nên bảng được tạo theo kiểu "tạo nếu chưa có".
 */
export async function ensureOvertimeSchema(env: Env): Promise<void> {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS overtime_daily (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, period TEXT NOT NULL, day INTEGER NOT NULL, hours REAL NOT NULL DEFAULT 0, no_meal INTEGER NOT NULL DEFAULT 0, note TEXT, UNIQUE(employee_id, period, day))",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS idx_ot_daily_emp_period ON overtime_daily(employee_id, period)",
  );
}

export interface OtDay {
  day: number;
  hours: number;
  /** Buổi OT không tính tiền cơm (VD: TC trưa, TC trước giờ làm). */
  noMeal?: boolean;
  note?: string | null;
}

/** Tiền cơm 1 buổi OT theo số giờ (làm tròn 0.5h). */
function mealForHours(h: number): number {
  const t = Math.round(h * 2) / 2;
  if (t === 1 || t === 1.5) return MEAL_SHORT;
  if (t >= 2 && t <= 5) return MEAL_LONG;
  return 0;
}

/** Chủ nhật? — theo ngày dương lịch của period (YYYY-MM) + day. */
function isSunday(period: string, day: number): boolean {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, day).getDay() === 0;
}

/** Cộng các ngày thành tổng NT/CN + tiền cơm. */
export function summarizeDays(
  period: string,
  days: OtDay[],
): { weekday: number; sunday: number; meal: number } {
  let weekday = 0;
  let sunday = 0;
  let meal = 0;
  for (const d of days) {
    const h = Number(d.hours) || 0;
    if (h <= 0) continue;
    if (isSunday(period, d.day)) sunday += h;
    else weekday += h;
    if (!d.noMeal) meal += mealForHours(h); // TC trưa / trước giờ làm → không tính cơm
  }
  return { weekday: +weekday.toFixed(2), sunday: +sunday.toFixed(2), meal };
}

/**
 * Ghi đè toàn bộ chi tiết ngày của 1 nhân viên trong 1 kỳ (dùng chung cho lưu
 * lưới ngày và import). Chỉ lưu ngày có giờ > 0.
 */
export async function replaceOvertimeDaily(
  env: Env,
  employeeId: number,
  period: string,
  days: OtDay[],
): Promise<void> {
  await ensureOvertimeSchema(env);
  await env.DB.prepare("DELETE FROM overtime_daily WHERE employee_id = ? AND period = ?")
    .bind(employeeId, period)
    .run();
  const valid = days.filter((d) => Number(d.hours) > 0 && d.day >= 1 && d.day <= 31);
  for (const d of valid) {
    await env.DB.prepare(
      "INSERT INTO overtime_daily (employee_id, period, day, hours, no_meal, note) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(employeeId, period, d.day, Number(d.hours), d.noMeal ? 1 : 0, d.note ?? null)
      .run();
  }
}

/** Ghi tổng OT (NT/CN/Lễ) + tiền cơm về bảng attendance của kỳ. */
async function writeAttendanceTotals(
  env: Env,
  employeeId: number,
  period: string,
  t: { weekday: number; sunday: number; holiday: number; meal: number },
): Promise<void> {
  const total = +(t.weekday + t.sunday + t.holiday).toFixed(2);
  await env.DB.prepare(
    `INSERT INTO attendance
       (employee_id, period, std_days, actual_days, pn, pb, vr, kp,
        overtime_hours, ot_weekday_hours, ot_sunday_hours, ot_holiday_hours,
        gas_days, meal_allowance, is_edited)
     VALUES (?, ?, 26, 0, 0, 0, 0, 26, ?, ?, ?, ?, 0, ?, 1)
     ON CONFLICT(employee_id, period) DO UPDATE SET
       overtime_hours = excluded.overtime_hours,
       ot_weekday_hours = excluded.ot_weekday_hours,
       ot_sunday_hours = excluded.ot_sunday_hours,
       ot_holiday_hours = excluded.ot_holiday_hours,
       meal_allowance = excluded.meal_allowance,
       is_edited = 1`,
  )
    .bind(employeeId, period, total, t.weekday, t.sunday, t.holiday, t.meal)
    .run();
}

/** GET /api/overtime?employeeId=&period= — danh sách ngày có OT của 1 NV/kỳ. */
export async function listOvertimeDaily(request: Request, env: Env): Promise<Response> {
  await ensureOvertimeSchema(env);
  const params = getParams(new URL(request.url));
  const employeeId = Number(params.employeeId);
  const period = (params.period || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}$/.test(period)) {
    return error("Thiếu employeeId hoặc period (YYYY-MM)", 400);
  }
  const { results } = await env.DB.prepare(
    "SELECT day, hours, no_meal, note FROM overtime_daily WHERE employee_id = ? AND period = ? ORDER BY day",
  )
    .bind(employeeId, period)
    .all();
  return json({ data: results, employeeId, period });
}

interface SaveBody {
  employeeId?: number;
  period?: string;
  days?: OtDay[];
  holidayHours?: number;
}

/**
 * PUT /api/overtime — lưu lưới ngày cho 1 NV/kỳ; tính lại tổng NT/CN + tiền cơm
 * và ghi về attendance. OT lễ (holidayHours) nhập ở mức tổng.
 */
export async function saveOvertimeDaily(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SaveBody>(request);
  const employeeId = Number(body.employeeId);
  const period = (body.period || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}$/.test(period)) {
    return error("Thiếu employeeId hoặc period (YYYY-MM)", 400);
  }

  // Không cho sửa nếu kỳ đã chốt (locked).
  const att = await env.DB.prepare(
    "SELECT locked FROM attendance WHERE employee_id = ? AND period = ?",
  )
    .bind(employeeId, period)
    .first<{ locked: number }>();
  if (att?.locked) return error("Kỳ chấm công đã bị khóa", 423);

  const days = Array.isArray(body.days) ? body.days : [];
  const holiday = +(Number(body.holidayHours) || 0).toFixed(2);

  await replaceOvertimeDaily(env, employeeId, period, days);
  const s = summarizeDays(period, days);
  await writeAttendanceTotals(env, employeeId, period, {
    weekday: s.weekday,
    sunday: s.sunday,
    holiday,
    meal: s.meal,
  });

  return json({
    success: true,
    totals: {
      otWeekdayHours: s.weekday,
      otSundayHours: s.sunday,
      otHolidayHours: holiday,
      overtimeHours: +(s.weekday + s.sunday + holiday).toFixed(2),
      mealAllowance: s.meal,
    },
  });
}
