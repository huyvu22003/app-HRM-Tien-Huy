-- Bước 2 lương: tạm ứng theo hình thức (CK/TM) + trừ nợ công ty.
-- - advance_ck / advance_tm: chi tiết tạm ứng chuyển khoản / tiền mặt
--   (tổng nên khớp với cột advance đang trừ vào lương).
-- - company_debt: khoản trừ nợ công ty (sheet NO), trừ vào thực trả.

ALTER TABLE compensation ADD COLUMN advance_ck REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN advance_tm REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN company_debt REAL DEFAULT 0;
