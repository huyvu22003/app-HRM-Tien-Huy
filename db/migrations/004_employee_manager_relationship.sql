ALTER TABLE employees
ADD COLUMN manager_employee_id INTEGER REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_employees_manager
ON employees(manager_employee_id);

UPDATE employees
SET manager_employee_id = (
  SELECT manager_match.id
  FROM employees AS manager_match
  WHERE lower(trim(manager_match.name)) = lower(trim(employees.manager))
    AND manager_match.id <> employees.id
)
WHERE manager_employee_id IS NULL
  AND manager IS NOT NULL
  AND trim(manager) NOT IN ('', '-')
  AND (
    SELECT COUNT(*)
    FROM employees AS candidate
    WHERE lower(trim(candidate.name)) = lower(trim(employees.manager))
      AND candidate.id <> employees.id
  ) = 1;
