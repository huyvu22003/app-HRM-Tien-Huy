-- Migration 003: Salary structure overhaul
-- Match real company payroll (44-column Excel) with full compensation breakdown

-- Compensation: add responsibility salary, gas allowance, attendance bonus, union dues
ALTER TABLE compensation ADD COLUMN responsibility_salary REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN gas_allowance REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN attendance_bonus REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN union_dues REAL DEFAULT 50000;

-- Insurance: add fixed amounts (company enters manually, not calculated from base)
ALTER TABLE insurance ADD COLUMN bhxh_amount REAL DEFAULT 0;
ALTER TABLE insurance ADD COLUMN bhyt_amount REAL DEFAULT 0;
ALTER TABLE insurance ADD COLUMN bhtn_amount REAL DEFAULT 0;

-- Attendance: add gas days, leave days, OT holiday/night, meal/night allowances, bonus
ALTER TABLE attendance ADD COLUMN gas_days REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN leave_days REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN ot_holiday_hours REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN ot_night_hours REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN meal_allowance REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN night_allowance REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN bonus REAL DEFAULT 0;
