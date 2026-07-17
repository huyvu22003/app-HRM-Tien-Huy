-- Migration 002: KPI sub-scores + Recognition/Rewards tables
-- Phase 1 of functional spec alignment

-- Add KPI sub-score columns (BC/25, NS/30, CL/25, DG/20) + note
ALTER TABLE kpi_scores ADD COLUMN bc REAL DEFAULT 0;
ALTER TABLE kpi_scores ADD COLUMN ns REAL DEFAULT 0;
ALTER TABLE kpi_scores ADD COLUMN cl REAL DEFAULT 0;
ALTER TABLE kpi_scores ADD COLUMN dg REAL DEFAULT 0;
ALTER TABLE kpi_scores ADD COLUMN note TEXT;
ALTER TABLE kpi_scores ADD COLUMN is_edited INTEGER DEFAULT 0;

-- Rewards / recognition
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  period TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('kpi_bonus','hot_bonus','recognition')),
  amount REAL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  proposed_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Improvement plans for KPI < 83
CREATE TABLE IF NOT EXISTS improvement_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  period TEXT NOT NULL,
  kpi_score REAL,
  step TEXT NOT NULL CHECK(step IN ('remind','training','commitment')),
  note TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, period)
);

-- Add salary-related columns for advance and bonus tracking
ALTER TABLE compensation ADD COLUMN kpi_bonus REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN hot_bonus REAL DEFAULT 0;
ALTER TABLE compensation ADD COLUMN advance REAL DEFAULT 0;

-- Add OT breakdown to attendance (weekday vs sunday)
ALTER TABLE attendance ADD COLUMN ot_weekday_hours REAL DEFAULT 0;
ALTER TABLE attendance ADD COLUMN ot_sunday_hours REAL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rewards_employee ON rewards(employee_id);
CREATE INDEX IF NOT EXISTS idx_rewards_period ON rewards(period);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_improvement_employee ON improvement_plans(employee_id);
