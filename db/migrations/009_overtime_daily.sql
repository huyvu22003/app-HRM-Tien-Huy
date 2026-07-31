-- Migration 009: Chi tiết tăng ca theo TỪNG NGÀY
-- Mỗi dòng = số giờ OT của 1 nhân viên trong 1 ngày của kỳ (period).
-- Loại OT (ngày thường / chủ nhật) suy ra từ ngày; OT lễ nhập ở mức tổng trên
-- bảng attendance (ot_holiday_hours). Tổng NT/CN + tiền cơm được app tính lại
-- từ bảng này mỗi khi lưu lưới ngày hoặc khi import file gốc.

CREATE TABLE IF NOT EXISTS overtime_daily (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  period      TEXT    NOT NULL,           -- YYYY-MM
  day         INTEGER NOT NULL,           -- 1..31
  hours       REAL    NOT NULL DEFAULT 0,
  note        TEXT,
  UNIQUE(employee_id, period, day)
);

CREATE INDEX IF NOT EXISTS idx_ot_daily_emp_period ON overtime_daily(employee_id, period);
