-- Seed 003: Real payroll data T06/2026 from company Excel
-- Updates compensation, insurance, and attendance for 20 employees

-- ============================================================
-- COMPENSATION: responsibility_salary, gas_allowance, attendance_bonus, union_dues
-- Also update base_salary and allowance to match real data
-- ============================================================

-- 1. Hoàng Công Phúc (ID=49) — Cắt Laser
UPDATE compensation SET base_salary=11200000, allowance=520000, responsibility_salary=3830000, gas_allowance=200000, attendance_bonus=450000, union_dues=50000 WHERE employee_id=49;
-- 2. Hoàng Phương Lộc (ID=23) — Cắt dây
UPDATE compensation SET base_salary=13000000, allowance=1300000, responsibility_salary=4050000, gas_allowance=200000, attendance_bonus=450000, union_dues=50000 WHERE employee_id=23;
-- 3. Nguyễn Văn Thiện (ID=1) — Phay CNC
UPDATE compensation SET base_salary=13000000, allowance=1300000, responsibility_salary=4050000, gas_allowance=200000, attendance_bonus=450000, union_dues=50000 WHERE employee_id=1;
-- 4. Chu Nam Anh (ID=6) — Phay CNC
UPDATE compensation SET base_salary=10900000, allowance=1200000, responsibility_salary=3000000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=6;
-- 5. Hồ Thị Phương (ID=65) — Qlsx
UPDATE compensation SET base_salary=8300000, allowance=500000, responsibility_salary=1800000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=65;
-- 6. Trần Thanh Trân (ID=60) — Tiện Cơ
UPDATE compensation SET base_salary=11000000, allowance=800000, responsibility_salary=3700000, gas_allowance=200000, attendance_bonus=500000, union_dues=50000 WHERE employee_id=60;
-- 7. Phạm Văn Duy (ID=57) — Tiện Cnc Sl Ít
UPDATE compensation SET base_salary=8700000, allowance=800000, responsibility_salary=2600000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=57;
-- 8. Lê Đức Huy (ID=16) — Dập
UPDATE compensation SET base_salary=9700000, allowance=800000, responsibility_salary=3800000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=16;
-- 9. Nguyễn Đăng Nghĩa (ID=56) — Tiện Cnc Sl Ít
UPDATE compensation SET base_salary=9000000, allowance=600000, responsibility_salary=3000000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=56;
-- 10. Hoàng Công Trí (ID=24) — Cắt Dây
UPDATE compensation SET base_salary=7500000, allowance=1000000, responsibility_salary=1500000, gas_allowance=200000, attendance_bonus=300000, union_dues=50000 WHERE employee_id=24;
-- 11. Nguyễn Văn Khang (ID=25) — Cắt Dây
UPDATE compensation SET base_salary=7500000, allowance=800000, responsibility_salary=700000, gas_allowance=200000, attendance_bonus=300000, union_dues=50000 WHERE employee_id=25;
-- 12. Vũ Đăng Khoa (ID=78) — Kho
UPDATE compensation SET base_salary=8100000, allowance=500000, responsibility_salary=2100000, gas_allowance=200000, attendance_bonus=300000, union_dues=50000 WHERE employee_id=78;
-- 13. Lê Văn Phương (ID=51) — Cưa-Quay-Nhuộm đen
UPDATE compensation SET base_salary=8000000, allowance=1100000, responsibility_salary=1500000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=51;
-- 14. Nguyễn Thanh Nhân (ID=61) — Qc
UPDATE compensation SET base_salary=8700000, allowance=1100000, responsibility_salary=2800000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=61;
-- 15. Bùi Thị Khánh (ID=66) — Qlsx
UPDATE compensation SET base_salary=8800000, allowance=1000000, responsibility_salary=2300000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=66;
-- 16. Nguyễn Thị Bích Liễu (ID=76) — Thu Mua
UPDATE compensation SET base_salary=8700000, allowance=700000, responsibility_salary=3000000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=76;
-- 17. Lê Văn Được (ID=17) — Dập
UPDATE compensation SET base_salary=6200000, allowance=520000, responsibility_salary=1000000, gas_allowance=0, attendance_bonus=300000, union_dues=50000 WHERE employee_id=17;
-- 18. Hoàng Thị Thanh (ID=18) — Dập
UPDATE compensation SET base_salary=6200000, allowance=500000, responsibility_salary=640000, gas_allowance=200000, attendance_bonus=200000, union_dues=50000 WHERE employee_id=18;
-- 19. Dương Hà Xuân An (ID=35) — Phay Cơ
UPDATE compensation SET base_salary=8300000, allowance=700000, responsibility_salary=2100000, gas_allowance=200000, attendance_bonus=400000, union_dues=50000 WHERE employee_id=35;
-- 20. Phạm Bá Công (ID=2) — Phay CNC
UPDATE compensation SET base_salary=13000000, allowance=1700000, responsibility_salary=3650000, gas_allowance=200000, attendance_bonus=450000, union_dues=50000 WHERE employee_id=2;

-- ============================================================
-- INSURANCE: fixed amounts from company records
-- ============================================================

UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=49;
UPDATE insurance SET bhxh_amount=584576, bhyt_amount=109608, bhtn_amount=73072 WHERE employee_id=23;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=1;
UPDATE insurance SET bhxh_amount=478536, bhyt_amount=89726, bhtn_amount=59817 WHERE employee_id=6;
UPDATE insurance SET bhxh_amount=504576, bhyt_amount=94608, bhtn_amount=63072 WHERE employee_id=65;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=60;
UPDATE insurance SET bhxh_amount=478536, bhyt_amount=89726, bhtn_amount=59817 WHERE employee_id=57;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=16;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=56;
UPDATE insurance SET bhxh_amount=478536, bhyt_amount=89726, bhtn_amount=59817 WHERE employee_id=24;
UPDATE insurance SET bhxh_amount=478536, bhyt_amount=89726, bhtn_amount=59817 WHERE employee_id=25;
UPDATE insurance SET bhxh_amount=440800, bhyt_amount=82650, bhtn_amount=55100 WHERE employee_id=78;
UPDATE insurance SET bhxh_amount=440800, bhyt_amount=82650, bhtn_amount=55100 WHERE employee_id=51;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=61;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=66;
UPDATE insurance SET bhxh_amount=504576, bhyt_amount=94608, bhtn_amount=63072 WHERE employee_id=76;
UPDATE insurance SET bhxh_amount=440800, bhyt_amount=82650, bhtn_amount=55100 WHERE employee_id=17;
UPDATE insurance SET bhxh_amount=440800, bhyt_amount=82650, bhtn_amount=55100 WHERE employee_id=18;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=35;
UPDATE insurance SET bhxh_amount=536576, bhyt_amount=100608, bhtn_amount=67072 WHERE employee_id=2;

-- ============================================================
-- ATTENDANCE: T06/2026 — actual_days, gas_days, leave_days, OT hours, meal/night allowances, bonus
-- ============================================================

-- Delete existing T06/2026 attendance for these employees and re-insert with full data
DELETE FROM attendance WHERE period='2026-06' AND employee_id IN (49,23,1,6,65,60,57,16,56,24,25,78,51,61,66,76,17,18,35,2);

-- CSV columns: actual_days, gas_days, leave_days, ot_sunday_hours, ot_weekday_hours, ot_night_hours, ot_holiday_hours, meal_allowance, night_allowance, bonus
-- Attendance bonus (chuyên cần) is from compensation, not attendance

INSERT INTO attendance (employee_id, period, std_days, actual_days, gas_days, leave_days, ot_sunday_hours, ot_weekday_hours, ot_night_hours, ot_holiday_hours, meal_allowance, night_allowance, bonus) VALUES
(49, '2026-06', 26, 26,    26,  0,   0,  13,   0, 0, 0,      0,      0),
(23, '2026-06', 26, 24.875, 25, 1,   0,  0,    0, 0, 0,      0,      0),
(1,  '2026-06', 26, 25,    25,  1,   0,  29,   0, 0, 300000, 0,      0),
(6,  '2026-06', 26, 26,    26,  0,   0,  0,    0, 0, 0,      0,      0),
(65, '2026-06', 26, 24,    24,  1,   0,  2,    0, 0, 25000,  0,      0),
(60, '2026-06', 26, 26,    27,  0,   8,  1.5,  0, 0, 0,      0,      0),
(57, '2026-06', 26, 26,    26,  0,   0,  24,   0, 0, 280000, 0,      0),
(16, '2026-06', 26, 15,    15,  0,   0,  0,    0, 0, 0,      0,      0),
(56, '2026-06', 26, 25.812, 27, 0,   8,  38,   0, 0, 475000, 0,      0),
(24, '2026-06', 26, 25,    25,  0,   0,  0,    0, 0, 0,      0,      0),
(25, '2026-06', 26, 25.5,  27,  0.5, 8,  0,    0, 0, 0,      0,      0),
(78, '2026-06', 26, 19.5,  20,  0,   0,  13.5, 0, 0, 70000,  0,      0),
(51, '2026-06', 26, 24.188, 25, 1,   8,  2,    0, 0, 20000,  0,      0),
(61, '2026-06', 26, 25,    25,  1,   0,  0,    0, 0, 0,      0,      0),
(66, '2026-06', 26, 26,    26,  0,   0,  2,    0, 0, 25000,  0,      0),
(76, '2026-06', 26, 25,    25,  1,   0,  14,   0, 0, 85000,  0,      0),
(17, '2026-06', 26, 26,    0,   0,   0,  0,    0, 0, 0,      0,      0),
(18, '2026-06', 26, 25.5,  26,  0.5, 0,  0,    0, 0, 0,      0,      0),
(35, '2026-06', 26, 25,    26,  1,   8,  10,   0, 0, 85000,  0,      0),
(2,  '2026-06', 26, 25,    25,  1,   0,  8,    0, 0, 80000,  0,      0);

-- ============================================================
-- COMPENSATION: update dependents and advance for T06/2026
-- ============================================================

UPDATE compensation SET dependents=2, advance=0       WHERE employee_id=49;
UPDATE compensation SET dependents=2, advance=0       WHERE employee_id=23;
UPDATE compensation SET dependents=3, advance=0       WHERE employee_id=1;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=6;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=65;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=60;
UPDATE compensation SET dependents=2, advance=0       WHERE employee_id=57;
UPDATE compensation SET dependents=1, advance=3000000 WHERE employee_id=16;
UPDATE compensation SET dependents=3, advance=0       WHERE employee_id=56;
UPDATE compensation SET dependents=0, advance=0       WHERE employee_id=24;
UPDATE compensation SET dependents=2, advance=2000000 WHERE employee_id=25;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=78;
UPDATE compensation SET dependents=0, advance=5000000 WHERE employee_id=51;
UPDATE compensation SET dependents=1, advance=6000000 WHERE employee_id=61;
UPDATE compensation SET dependents=2, advance=0       WHERE employee_id=66;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=76;
UPDATE compensation SET dependents=2, advance=0       WHERE employee_id=17;
UPDATE compensation SET dependents=0, advance=3000000 WHERE employee_id=18;
UPDATE compensation SET dependents=1, advance=0       WHERE employee_id=35;
UPDATE compensation SET dependents=1, advance=1500000 WHERE employee_id=2;
