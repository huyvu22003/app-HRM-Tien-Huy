-- Link HR/IT login accounts to the matching employee profiles and real phone numbers.
-- Password remains unchanged; only the login phone and employee link are corrected.

UPDATE users
SET
  employee_id = (SELECT id FROM employees WHERE code = '0088'),
  phone = (SELECT phone FROM employees WHERE code = '0088'),
  updated_at = datetime('now')
WHERE phone IN ('0909000002', '0985040797')
  OR employee_id = (SELECT id FROM employees WHERE code = '0088');

UPDATE employees
SET phone = '0937454099',
    updated_at = datetime('now')
WHERE code = 'IT-001';

UPDATE users
SET
  employee_id = (SELECT id FROM employees WHERE code = 'IT-001'),
  phone = '0937454099',
  updated_at = datetime('now')
WHERE phone IN ('0909000005', '0966703958', '0937454099')
  OR employee_id = (SELECT id FROM employees WHERE code = 'IT-001');
