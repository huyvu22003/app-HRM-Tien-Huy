-- Bước 3 lương: cách nhận lương (chuyển khoản / tiền mặt) + ghép lương.
-- - pay_method: 'CK' (chuyển khoản) | 'TM' (tiền mặt). Mặc định CK.
-- - merge_into: mã nhân viên NHẬN THAY (khi lương người này được ghép/chuyển
--   vào tài khoản người khác). NULL = tự nhận.

ALTER TABLE compensation ADD COLUMN pay_method TEXT DEFAULT 'CK';
ALTER TABLE compensation ADD COLUMN merge_into TEXT;
