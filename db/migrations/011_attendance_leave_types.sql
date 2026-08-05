-- Migration 011: Thêm loại phép cho chấm công.
-- PC (phép cưới), PT (phép tang), TNLĐ (tai nạn lao động) → hưởng 100% lương.
-- PTS (phép thai sản) → không hưởng lương (chỉ trừ KP, không cộng leave_days).
-- Worker cũng tự thêm cột này khi chạy (ensureSchema) nếu chưa có.

ALTER TABLE attendance ADD COLUMN pc REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN pts REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN pt REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN tnld REAL DEFAULT 0;
