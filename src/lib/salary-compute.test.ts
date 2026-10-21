import { describe, expect, it } from "vitest";
import type { ApiSalaryRow } from "./api";
import { computeSalary } from "./salary-compute";

const salaryRow = (overrides: Partial<ApiSalaryRow> = {}) => ({
  employee_id: 1,
  code: "0001",
  name: "Nhân viên thử nghiệm",
  department_id: null,
  department_name: null,
  base_salary: 7_800_000,
  allowance: 0,
  responsibility_salary: 0,
  gas_allowance: 0,
  attendance_bonus: 400_000,
  union_dues: 0,
  dependents: 0,
  kpi_bonus: 0,
  hot_bonus: 0,
  advance: 0,
  advance_ck: 0,
  advance_tm: 0,
  company_debt: 0,
  pay_method: null,
  merge_into: null,
  bank: null,
  std_days: 26,
  actual_days: 26,
  pn: 0,
  vr: 0,
  kp: 0,
  gas_days: 0,
  leave_days: 0,
  overtime_hours: 0,
  ot_weekday_hours: 0,
  ot_sunday_hours: 0,
  ot_holiday_hours: 0,
  ot_night_hours: 0,
  meal_allowance: 0,
  night_allowance: 0,
  bonus: 0,
  ins_salary_base: 0,
  bhxh_amount: 0,
  bhyt_amount: 0,
  bhtn_amount: 0,
  bhxh_manual: null,
  bhyt_manual: null,
  bhtn_manual: null,
  kpi_score: null,
  kpi_rank: null,
  ...overrides,
}) satisfies ApiSalaryRow;

describe("computeSalary attendance and union rules", () => {
  it("charges 50,000 union dues from 13 actual work days", () => {
    expect(computeSalary(salaryRow({ actual_days: 12.99 })).unionDues).toBe(0);
    expect(computeSalary(salaryRow({ actual_days: 13 })).unionDues).toBe(50_000);
  });

  it("removes attendance bonus from 1 unexcused leave day", () => {
    expect(computeSalary(salaryRow({ kp: 0.99 })).attendanceActual).toBe(400_000);
    expect(computeSalary(salaryRow({ kp: 1 })).attendanceActual).toBe(0);
  });

  it("removes attendance bonus from 2 personal leave days", () => {
    expect(computeSalary(salaryRow({ vr: 1.99 })).attendanceActual).toBe(400_000);
    expect(computeSalary(salaryRow({ vr: 2 })).attendanceActual).toBe(0);
  });
});
