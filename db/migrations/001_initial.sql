-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super','hr','lead','staff')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  block TEXT NOT NULL,
  block_color TEXT DEFAULT '#1e6fd0',
  head_employee_id INTEGER,
  parent_id INTEGER REFERENCES departments(id)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  phone TEXT,
  cccd TEXT,
  address TEXT,
  email TEXT,
  department_id INTEGER REFERENCES departments(id),
  position TEXT,
  workplace TEXT,
  contract_type TEXT,
  contract_end TEXT,
  join_date TEXT,
  resign_request_date TEXT,
  resign_date TEXT,
  status TEXT DEFAULT 'Đang làm việc',
  manager TEXT,
  level TEXT,
  photo_url TEXT,
  bank TEXT,
  tax_code TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Compensation (separate for access control)
CREATE TABLE IF NOT EXISTS compensation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER UNIQUE REFERENCES employees(id),
  base_salary REAL DEFAULT 0,
  allowance REAL DEFAULT 0,
  dependents INTEGER DEFAULT 0,
  effective_from TEXT
);

-- Insurance
CREATE TABLE IF NOT EXISTS insurance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER UNIQUE REFERENCES employees(id),
  status TEXT DEFAULT 'Chưa tham gia',
  ins_code TEXT,
  bhxh_book TEXT,
  bhyt_code TEXT,
  bhyt_clinic TEXT,
  start_date TEXT,
  salary_base REAL DEFAULT 0
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  period TEXT NOT NULL,
  std_days INTEGER DEFAULT 26,
  actual_days REAL DEFAULT 26,
  pn REAL DEFAULT 0,
  pb REAL DEFAULT 0,
  vr REAL DEFAULT 0,
  kp REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  locked INTEGER DEFAULT 0,
  UNIQUE(employee_id, period)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  type_code TEXT NOT NULL CHECK(type_code IN ('PN','PB','VR','TS','NL','KP')),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved_l1','approved_l2','approved','rejected')),
  current_step INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  approved_l1_by INTEGER REFERENCES users(id),
  approved_l1_at TEXT,
  approved_l2_by INTEGER REFERENCES users(id),
  approved_l2_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  year INTEGER NOT NULL,
  entitled REAL DEFAULT 12,
  carried REAL DEFAULT 0,
  used REAL DEFAULT 0,
  pending REAL DEFAULT 0,
  UNIQUE(employee_id, year)
);

-- Maternity leaves
CREATE TABLE IF NOT EXISTS maternity_leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  months INTEGER DEFAULT 6,
  children INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK(status IN ('soon','active','returning','done')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- KPI scores
CREATE TABLE IF NOT EXISTS kpi_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  period TEXT NOT NULL,
  score REAL DEFAULT 0,
  rank TEXT,
  signed_l1 INTEGER DEFAULT 0,
  signed_l1_by INTEGER REFERENCES users(id),
  signed_l2 INTEGER DEFAULT 0,
  signed_l2_by INTEGER REFERENCES users(id),
  UNIQUE(employee_id, period)
);

-- Period closing
CREATE TABLE IF NOT EXISTS period_close (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  step TEXT NOT NULL CHECK(step IN ('attendance','leave','kpi','payroll')),
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','locked')),
  signed_l1_by INTEGER REFERENCES users(id),
  signed_l2_by INTEGER REFERENCES users(id),
  locked_at TEXT,
  UNIQUE(period, step)
);

-- System config
CREATE TABLE IF NOT EXISTS rules_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Login page config
CREATE TABLE IF NOT EXISTS login_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Salary formulas
CREATE TABLE IF NOT EXISTS salary_formula (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  expression TEXT NOT NULL,
  label TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- PIT config
CREATE TABLE IF NOT EXISTS pit_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enabled INTEGER DEFAULT 1,
  brackets TEXT NOT NULL, -- JSON array
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Role permissions (drill-down matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed INTEGER DEFAULT 0,
  UNIQUE(role, module, action)
);

-- Employee documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  type TEXT,
  file_name TEXT,
  file_key TEXT NOT NULL, -- R2 key
  file_size INTEGER,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT,
  title TEXT NOT NULL,
  target_screen TEXT,
  target_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  before_data TEXT, -- JSON
  after_data TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_kpi_period ON kpi_scores(period);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
