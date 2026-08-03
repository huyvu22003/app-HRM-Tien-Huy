-- Migration 010: Thêm cột "Chuyên môn" cho nhân viên (đồng bộ mẫu 43 cột).
-- Worker cũng tự thêm cột này khi chạy (ensureEmployeeColumns) nếu chưa có, nên
-- không bắt buộc chạy tay trên D1.

ALTER TABLE employees ADD COLUMN specialization TEXT;
