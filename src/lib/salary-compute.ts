import { type ApiSalaryRow } from "@/lib/api";

// Công thức tính lương dùng chung cho bảng lương (desktop) và phiếu lương (mobile).

export const STD_DAYS = 26;
const HOURS_PER_DAY = 8;
const PERSONAL_DEDUCTION = 15_500_000;
const DEPENDENT_DEDUCTION = 6_200_000;

// TẠM NGẮT thuế TNCN và KPI khỏi bảng lương.
// - Thuế TNCN vẫn nằm trong công thức (khoản trừ) nhưng trả 0 cho tới khi bật lại.
// - KPI không cộng vào thu nhập lương.
// Bật lại thuế: đổi cờ này thành true.
export const SALARY_PIT_ENABLED = false;

const PIT_BRACKETS = [
  { upTo: 10_000_000, rate: 0.05, quick: 0 },
  { upTo: 30_000_000, rate: 0.1, quick: 500_000 },
  { upTo: 60_000_000, rate: 0.2, quick: 3_500_000 },
  { upTo: 100_000_000, rate: 0.3, quick: 9_500_000 },
  { upTo: Infinity, rate: 0.35, quick: 14_500_000 },
];

export function computePIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const b of PIT_BRACKETS) {
    if (taxableIncome <= b.upTo) {
      return Math.round(taxableIncome * b.rate - b.quick);
    }
  }
  return 0;
}

export interface SalaryComputed {
  base: number;
  responsibility: number;
  allowance: number;
  gasAllowanceMonth: number;
  attendanceBonus: number;
  totalMonthly: number;
  actualDays: number;
  gasDays: number;
  leaveDays: number;
  otWeekdayHours: number;
  otSundayHours: number;
  otHolidayHours: number;
  otNightHours: number;
  dependents: number;
  workSalary: number;
  responsibilityActual: number;
  allowanceActual: number;
  attendanceActual: number;
  otWeekday: number;
  otSunday: number;
  otHoliday: number;
  bonus: number;
  mealAllowance: number;
  gasAllowanceActual: number;
  nightAllowance: number;
  leavePay: number;
  totalIncome: number;
  taxableIncome: number;
  bhxh: number;
  bhyt: number;
  bhtn: number;
  insuranceTotal: number;
  unionDues: number;
  advance: number;
  advanceCk: number;
  advanceTm: number;
  companyDebt: number;
  taxableAfterDeductions: number;
  pit: number;
  netPay: number;
}

export function computeSalary(row: ApiSalaryRow): SalaryComputed {
  const base = row.base_salary ?? 0;
  const responsibility = row.responsibility_salary ?? 0;
  const allowance = row.allowance ?? 0;
  const gasAllowanceMonth = row.gas_allowance ?? 0;
  const attendanceBonus = row.attendance_bonus ?? 0;
  const totalMonthly = base + responsibility + allowance + gasAllowanceMonth + attendanceBonus;

  const actualDays = row.actual_days ?? 0;
  const gasDays = row.gas_days ?? 0;
  const leaveDays = row.leave_days ?? 0;
  const otWeekdayHours = row.ot_weekday_hours ?? 0;
  const otSundayHours = row.ot_sunday_hours ?? 0;
  const otHolidayHours = row.ot_holiday_hours ?? 0;
  const otNightHours = row.ot_night_hours ?? 0;
  const dependents = row.dependents ?? 0;

  const dailyBase = base / STD_DAYS;
  const hourlyBase = dailyBase / HOURS_PER_DAY;

  const workSalary = Math.round(dailyBase * actualDays);
  const responsibilityActual = Math.round((responsibility / STD_DAYS) * actualDays);
  const allowanceActual = Math.round((allowance / STD_DAYS) * actualDays);
  const attendanceActual = row.attendance_bonus ?? 0;
  // Tăng ca trả nguyên theo hệ số: thường 150%, chủ nhật 200%, lễ 300%.
  const otWeekday = Math.round(hourlyBase * otWeekdayHours * 1.5);
  const otSunday = Math.round(hourlyBase * otSundayHours * 2.0);
  const otHoliday = Math.round(hourlyBase * otHolidayHours * 3.0);
  const bonus = row.bonus ?? 0;
  const mealAllowance = row.meal_allowance ?? 0;
  const gasAllowanceActual = gasDays > 0 ? Math.round((gasAllowanceMonth / STD_DAYS) * gasDays) : 0;
  const nightAllowance = row.night_allowance ?? 0;
  const leavePay = leaveDays > 0 ? Math.round(dailyBase * leaveDays) : 0;

  // Tổng thu nhập (Gross) — KHÔNG cộng KPI.
  const totalIncome = workSalary + responsibilityActual + allowanceActual + attendanceActual
    + otWeekday + otSunday + otHoliday
    + bonus + mealAllowance + gasAllowanceActual + nightAllowance + leavePay;

  const taxableIncome = totalIncome;

  const bhxh = row.bhxh_amount ?? 0;
  const bhyt = row.bhyt_amount ?? 0;
  const bhtn = row.bhtn_amount ?? 0;
  const insuranceTotal = bhxh + bhyt + bhtn;
  const unionDues = row.union_dues ?? 50000;
  // Tạm ứng: ưu tiên tổng CK+TM nếu có; nếu chưa nhập thì dùng cột advance cũ.
  const advanceCk = row.advance_ck ?? 0;
  const advanceTm = row.advance_tm ?? 0;
  const advance = Math.max(row.advance ?? 0, advanceCk + advanceTm);
  const companyDebt = row.company_debt ?? 0;

  const taxableAfterDeductions = taxableIncome - insuranceTotal - PERSONAL_DEDUCTION - dependents * DEPENDENT_DEDUCTION;
  // Thuế TNCN tạm ngắt (trả 0 tới khi bật lại SALARY_PIT_ENABLED).
  const pit = SALARY_PIT_ENABLED ? computePIT(taxableAfterDeductions) : 0;

  // Thực trả = Gross − BHXH − BHYT − BHTN − ĐPCĐ − Tạm ứng − Trừ nợ − Thuế TNCN.
  const netPay = totalIncome - insuranceTotal - unionDues - advance - companyDebt - pit;

  return {
    base, responsibility, allowance, gasAllowanceMonth, attendanceBonus, totalMonthly,
    actualDays, gasDays, leaveDays, otWeekdayHours, otSundayHours, otHolidayHours, otNightHours, dependents,
    workSalary, responsibilityActual, allowanceActual, attendanceActual,
    otWeekday, otSunday, otHoliday,
    bonus, mealAllowance, gasAllowanceActual, nightAllowance, leavePay,
    totalIncome, taxableIncome,
    bhxh, bhyt, bhtn, insuranceTotal, unionDues, advance, advanceCk, advanceTm, companyDebt,
    taxableAfterDeductions, pit, netPay,
  };
}
