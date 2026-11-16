-- Lưu kết quả đối chiếu khuôn mặt và kiểm tra người thật của lượt chấm công.
ALTER TABLE checkins ADD COLUMN face_similarity REAL;
ALTER TABLE checkins ADD COLUMN face_real REAL;
ALTER TABLE checkins ADD COLUMN face_live REAL;
