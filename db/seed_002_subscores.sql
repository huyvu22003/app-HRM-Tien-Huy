-- Seed 002: Backfill KPI sub-scores for existing records
-- Sub-scores: BC (max 25), NS (max 30), CL (max 25), DG (max 20) = total 100
-- Distribution algorithm: proportional to total score with slight variance

-- Employee 1: score=89 → BC=22, NS=27, CL=22, DG=18
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=18 WHERE employee_id=1 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=18, dg=15 WHERE employee_id=2 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=28, cl=23, dg=17 WHERE employee_id=3 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=22, cl=18, dg=15 WHERE employee_id=4 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=23, cl=19, dg=16 WHERE employee_id=5 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=6 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=24, dg=18 WHERE employee_id=7 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=8 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=9 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=10 AND period='2026-06';
UPDATE kpi_scores SET bc=25, ns=29, cl=25, dg=18 WHERE employee_id=11 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=27, cl=23, dg=18 WHERE employee_id=12 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=17 WHERE employee_id=13 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=14 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=28, cl=23, dg=18 WHERE employee_id=15 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=23, cl=19, dg=16 WHERE employee_id=16 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=17 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=17 WHERE employee_id=18 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=24, dg=18 WHERE employee_id=19 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=17 WHERE employee_id=20 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=16 WHERE employee_id=21 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=24, dg=18 WHERE employee_id=22 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=26, cl=21, dg=17 WHERE employee_id=23 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=24, cl=20, dg=17 WHERE employee_id=24 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=29, cl=24, dg=18 WHERE employee_id=25 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=24, dg=18 WHERE employee_id=26 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=23, cl=19, dg=16 WHERE employee_id=27 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=28 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=24, cl=20, dg=17 WHERE employee_id=29 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=16 WHERE employee_id=30 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=23, dg=18 WHERE employee_id=31 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=24, cl=20, dg=17 WHERE employee_id=32 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=26, cl=21, dg=17 WHERE employee_id=33 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=25, cl=21, dg=17 WHERE employee_id=34 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=27, cl=22, dg=18 WHERE employee_id=35 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=36 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=17, dg=14 WHERE employee_id=37 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=26, cl=22, dg=17 WHERE employee_id=38 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=39 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=15 WHERE employee_id=40 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=41 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=18, dg=15 WHERE employee_id=42 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=43 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=16 WHERE employee_id=44 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=45 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=28, cl=23, dg=18 WHERE employee_id=46 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=16 WHERE employee_id=47 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=48 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=15 WHERE employee_id=49 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=16 WHERE employee_id=50 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=15 WHERE employee_id=51 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=23, dg=18 WHERE employee_id=52 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=24, dg=18 WHERE employee_id=53 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=28, cl=23, dg=18 WHERE employee_id=54 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=26, cl=21, dg=17 WHERE employee_id=55 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=17 WHERE employee_id=56 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=16 WHERE employee_id=57 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=27, cl=23, dg=18 WHERE employee_id=58 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=59 AND period='2026-06';
UPDATE kpi_scores SET bc=23, ns=28, cl=23, dg=18 WHERE employee_id=60 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=16 WHERE employee_id=61 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=16 WHERE employee_id=62 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=25, cl=21, dg=17 WHERE employee_id=63 AND period='2026-06';
UPDATE kpi_scores SET bc=25, ns=29, cl=25, dg=18 WHERE employee_id=64 AND period='2026-06';
UPDATE kpi_scores SET bc=21, ns=24, cl=20, dg=17 WHERE employee_id=65 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=23, cl=19, dg=16 WHERE employee_id=66 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=16 WHERE employee_id=67 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=26, cl=22, dg=17 WHERE employee_id=68 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=17, dg=14 WHERE employee_id=69 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=23, cl=19, dg=16 WHERE employee_id=70 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=18 WHERE employee_id=71 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=25, cl=21, dg=17 WHERE employee_id=72 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=17, dg=14 WHERE employee_id=73 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=74 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=22, cl=18, dg=15 WHERE employee_id=75 AND period='2026-06';
UPDATE kpi_scores SET bc=19, ns=23, cl=18, dg=16 WHERE employee_id=76 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=19, dg=16 WHERE employee_id=77 AND period='2026-06';
UPDATE kpi_scores SET bc=22, ns=27, cl=22, dg=17 WHERE employee_id=78 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=16 WHERE employee_id=79 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=29, cl=24, dg=18 WHERE employee_id=80 AND period='2026-06';
UPDATE kpi_scores SET bc=24, ns=28, cl=23, dg=18 WHERE employee_id=81 AND period='2026-06';
UPDATE kpi_scores SET bc=18, ns=21, cl=18, dg=15 WHERE employee_id=82 AND period='2026-06';
UPDATE kpi_scores SET bc=20, ns=24, cl=20, dg=17 WHERE employee_id=83 AND period='2026-06';

-- Seed some rewards for demo (employees with KPI >= 90)
INSERT INTO rewards (employee_id, period, type, amount, reason, status, proposed_by) VALUES
  (7, '2026-06', 'kpi_bonus', 2000000, 'KPI xuất sắc kỳ 06/2026 (94 điểm)', 'approved', 2),
  (11, '2026-06', 'kpi_bonus', 3000000, 'KPI xuất sắc kỳ 06/2026 (97 điểm)', 'approved', 2),
  (64, '2026-06', 'kpi_bonus', 3000000, 'KPI xuất sắc kỳ 06/2026 (97 điểm)', 'approved', 2),
  (25, '2026-06', 'hot_bonus', 1500000, 'Hoàn thành dự án khuôn mẫu trước deadline', 'approved', 1),
  (3, '2026-06', 'recognition', 1000000, 'Đề xuất cải tiến quy trình sản xuất', 'pending', 2),
  (15, '2026-06', 'recognition', 1000000, 'Hỗ trợ đào tạo nhân viên mới xuất sắc', 'pending', 2);

-- Seed improvement plans for low KPI employees
INSERT INTO improvement_plans (employee_id, period, kpi_score, step, note) VALUES
  (37, '2026-06', 70, 'remind', 'Cần cải thiện báo cáo và năng suất'),
  (69, '2026-06', 70, 'remind', 'Cần cải thiện chất lượng sản phẩm'),
  (73, '2026-06', 70, 'remind', 'Cần nâng cao kỹ năng vận hành máy');
