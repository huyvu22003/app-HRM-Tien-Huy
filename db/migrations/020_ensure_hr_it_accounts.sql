-- Ensure the canonical HR and IT login rows exist in production.
-- SHA-256 below is the existing project hash for the requested default password.

INSERT INTO users (employee_id, phone, password_hash, role, active)
VALUES (
  (SELECT id FROM employees WHERE code = '0088'),
  '0985040797',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'hr',
  1
)
ON CONFLICT(phone) DO UPDATE SET
  employee_id = excluded.employee_id,
  password_hash = excluded.password_hash,
  role = excluded.role,
  active = 1,
  updated_at = datetime('now');

INSERT INTO users (employee_id, phone, password_hash, role, active)
VALUES (
  (SELECT id FROM employees WHERE code = 'IT-001'),
  '0937454099',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'super',
  1
)
ON CONFLICT(phone) DO UPDATE SET
  employee_id = excluded.employee_id,
  password_hash = excluded.password_hash,
  role = excluded.role,
  active = 1,
  updated_at = datetime('now');
