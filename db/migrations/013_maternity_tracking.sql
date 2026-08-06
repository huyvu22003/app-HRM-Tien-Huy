-- Migration 013: Theo dõi thai kỳ chi tiết (từ lúc mang thai → nghỉ sanh).
-- Mở rộng maternity_leaves + thêm bảng khám thai định kỳ (tối đa 5 lần).
-- Worker cũng tự thêm khi chạy (ensureSchema) nếu chưa có.

ALTER TABLE maternity_leaves ADD COLUMN notified_date TEXT;  -- ngày báo mang thai / bắt đầu theo dõi
ALTER TABLE maternity_leaves ADD COLUMN due_date TEXT;        -- ngày dự sinh
ALTER TABLE maternity_leaves ADD COLUMN note TEXT;

CREATE TABLE IF NOT EXISTS prenatal_checkups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  maternity_id INTEGER NOT NULL,
  seq          INTEGER NOT NULL,            -- lần khám 1..5
  checkup_date TEXT,                        -- ngày khám (nghỉ)
  days         REAL NOT NULL DEFAULT 1,     -- 1 ngày (thường) / 2 ngày (đặc biệt)
  special      INTEGER NOT NULL DEFAULT 0,  -- thai bệnh lý / ở xa cơ sở y tế
  doc_submitted INTEGER NOT NULL DEFAULT 0, -- đã nộp giấy chứng nhận nghỉ hưởng BHXH
  note         TEXT,
  UNIQUE(maternity_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_prenatal_maternity ON prenatal_checkups(maternity_id);
