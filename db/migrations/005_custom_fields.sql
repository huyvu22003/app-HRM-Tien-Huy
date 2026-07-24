-- Cột tùy chỉnh (user-defined columns) cho danh sách nhân viên.
-- Định nghĩa cột dùng chung toàn công ty; giá trị lưu theo từng nhân viên.
-- Lưu ở máy chủ để không mất khi đăng xuất / đổi máy / đổi trình duyệt.

CREATE TABLE IF NOT EXISTS custom_fields (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'number' | 'select'
  options    TEXT,                            -- JSON array cho type 'select'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_custom_values (
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_id    TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value       TEXT,
  PRIMARY KEY (employee_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_ecv_field ON employee_custom_values(field_id);
CREATE INDEX IF NOT EXISTS idx_ecv_employee ON employee_custom_values(employee_id);
