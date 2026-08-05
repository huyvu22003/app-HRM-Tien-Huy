-- Migration 012: Đánh dấu buổi OT không tính tiền cơm (TC trưa, TC trước giờ làm).
-- Worker cũng tự thêm cột này khi chạy (ensureSchema) nếu chưa có.

ALTER TABLE overtime_daily ADD COLUMN no_meal INTEGER DEFAULT 0;
