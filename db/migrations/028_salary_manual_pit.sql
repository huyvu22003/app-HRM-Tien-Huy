-- Thuế TNCN nhập trực tiếp trên bảng lương, dùng cho phiếu lương người lao động.
ALTER TABLE compensation ADD COLUMN pit_manual REAL DEFAULT 0;
