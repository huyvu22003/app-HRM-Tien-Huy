-- Ensure the IT login has a concrete employee profile in older production DBs.

INSERT INTO employees (code, name, phone, position, status)
VALUES ('IT-001', '_Huy (IT)', '0937454099', 'Quản trị hệ thống', 'Đang làm việc')
ON CONFLICT(code) DO UPDATE SET
  name = excluded.name,
  phone = excluded.phone,
  position = excluded.position,
  status = excluded.status,
  updated_at = datetime('now');

UPDATE users
SET employee_id = (SELECT id FROM employees WHERE code = 'IT-001'),
    updated_at = datetime('now')
WHERE phone = '0937454099';
