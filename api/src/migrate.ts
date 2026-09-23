import type { Env } from "./middleware/auth";

/**
 * Trình migrate CSDL chạy TRONG Worker (tự động khi deploy).
 *
 * GitHub Actions chỉ chạy `wrangler deploy` chứ không áp migration, còn
 * `wrangler d1 migrations apply` lại chạy lại toàn bộ file 001–010 trên DB
 * production (vốn migrate thủ công) gây lỗi "table/column đã tồn tại". Nên ở đây
 * mỗi isolate mới (sau mỗi lần deploy) tự áp các BƯỚC còn thiếu và ghi sổ vào
 * bảng schema_migrations.
 *
 * QUY TẮC: mỗi bước phải IDEMPOTENT (chạy lại vẫn an toàn) —
 *   - Bảng: CREATE TABLE IF NOT EXISTS
 *   - Cột : kiểm tra PRAGMA rồi mới ALTER TABLE ADD COLUMN
 * Thêm bước mới vào CUỐI mảng STEPS, không sửa id của bước cũ.
 */

let ensured = false;

async function hasColumn(env: Env, table: string, col: string): Promise<boolean> {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return info.results.some((c) => c.name === col);
}

async function addColumn(env: Env, table: string, col: string, type: string): Promise<void> {
  if (!(await hasColumn(env, table, col))) {
    await env.DB.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

const STEPS: { id: string; run: (env: Env) => Promise<void> }[] = [
  {
    id: "009_overtime_daily",
    run: async (env) => {
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS overtime_daily (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, period TEXT NOT NULL, day INTEGER NOT NULL, hours REAL NOT NULL DEFAULT 0, note TEXT, UNIQUE(employee_id, period, day))",
      );
      await env.DB.exec(
        "CREATE INDEX IF NOT EXISTS idx_ot_daily_emp_period ON overtime_daily(employee_id, period)",
      );
    },
  },
  {
    id: "010_employee_specialization",
    run: async (env) => {
      await addColumn(env, "employees", "specialization", "TEXT");
    },
  },
  {
    id: "011_attendance_leave_types",
    run: async (env) => {
      await addColumn(env, "attendance", "pc", "REAL DEFAULT 0"); // phép cưới
      await addColumn(env, "attendance", "pts", "REAL DEFAULT 0"); // phép thai sản
      await addColumn(env, "attendance", "pt", "REAL DEFAULT 0"); // phép tang
      await addColumn(env, "attendance", "tnld", "REAL DEFAULT 0"); // tai nạn lao động
    },
  },
  {
    id: "012_overtime_no_meal",
    run: async (env) => {
      await addColumn(env, "overtime_daily", "no_meal", "INTEGER DEFAULT 0"); // buổi OT không tính cơm
    },
  },
  {
    id: "013_maternity_tracking",
    run: async (env) => {
      await addColumn(env, "maternity_leaves", "notified_date", "TEXT");
      await addColumn(env, "maternity_leaves", "due_date", "TEXT");
      await addColumn(env, "maternity_leaves", "note", "TEXT");
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS prenatal_checkups (id INTEGER PRIMARY KEY AUTOINCREMENT, maternity_id INTEGER NOT NULL, seq INTEGER NOT NULL, checkup_date TEXT, days REAL NOT NULL DEFAULT 1, special INTEGER NOT NULL DEFAULT 0, doc_submitted INTEGER NOT NULL DEFAULT 0, note TEXT, UNIQUE(maternity_id, seq))",
      );
      await env.DB.exec(
        "CREATE INDEX IF NOT EXISTS idx_prenatal_maternity ON prenatal_checkups(maternity_id)",
      );
    },
  },
  {
    id: "014_prenatal_doc_file",
    run: async (env) => {
      await addColumn(env, "prenatal_checkups", "doc_key", "TEXT"); // key tệp giấy BHXH trên R2
      await addColumn(env, "prenatal_checkups", "doc_name", "TEXT"); // tên gốc tệp để hiển thị
    },
  },
  {
    id: "015_leave_applied_flag",
    run: async (env) => {
      // Đánh dấu đơn nghỉ đã duyệt đã được áp vào bảng chấm công (tránh cộng trùng).
      await addColumn(env, "leave_requests", "applied", "INTEGER DEFAULT 0");
    },
  },
  {
    id: "016_prenatal_applied_flag",
    run: async (env) => {
      // Đánh dấu lần khám thai đã được áp vào bảng chấm công (cột PTS).
      await addColumn(env, "prenatal_checkups", "applied", "INTEGER DEFAULT 0");
    },
  },
  {
    id: "017_selfie_checkins",
    run: async (env) => {
      // Chấm công selfie có định vị (mỗi nhân viên 1 dòng/ngày; vào & ra).
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, date TEXT NOT NULL, time_in TEXT, time_out TEXT, lat REAL, lng REAL, accuracy REAL, photo_key TEXT, photo_out_key TEXT, workplace TEXT, created_at TEXT DEFAULT (datetime('now')), UNIQUE(employee_id, date))",
      );
      await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_checkins_emp_date ON checkins(employee_id, date)");
    },
  },
  {
    id: "018_daily_reports",
    run: async (env) => {
      // Báo cáo công việc ngày (nhân viên nộp; tổ trưởng/HR xác nhận).
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, date TEXT NOT NULL, content TEXT NOT NULL, quantity REAL DEFAULT 0, ng_count REAL DEFAULT 0, note TEXT, status TEXT DEFAULT 'pending', submitted_at TEXT DEFAULT (datetime('now')), verified_by INTEGER, verified_at TEXT)",
      );
      await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date)");
      await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_reports_emp ON reports(employee_id)");
    },
  },

  {
    id: "019_link_hr_it_accounts",
    run: async (env) => {
      // Gắn tài khoản test HR/IT với đúng hồ sơ nhân viên và số điện thoại trong danh sách.
      await env.DB.prepare(
        `UPDATE users
         SET employee_id = (SELECT id FROM employees WHERE code = '0088'),
             phone = (SELECT phone FROM employees WHERE code = '0088'),
             updated_at = datetime('now')
         WHERE phone IN ('0909000002', '0985040797')
            OR employee_id = (SELECT id FROM employees WHERE code = '0088')`,
      ).run();
      await env.DB.prepare(
        `UPDATE employees
         SET phone = '0937454099',
             updated_at = datetime('now')
         WHERE code = 'IT-001'`,
      ).run();
      await env.DB.prepare(
        `UPDATE users
         SET employee_id = (SELECT id FROM employees WHERE code = 'IT-001'),
             phone = '0937454099',
             updated_at = datetime('now')
         WHERE phone IN ('0909000005', '0966703958', '0937454099')
            OR employee_id = (SELECT id FROM employees WHERE code = 'IT-001')`,
      ).run();
    },
  },
  {
    id: "020_ensure_hr_it_accounts",
    run: async (env) => {
      // Migration 019 only updated existing rows. Some production databases do
      // not contain the legacy HR row, so upsert the two canonical accounts.
      const defaultPasswordHash =
        "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
      await env.DB.prepare(
        `INSERT INTO users (employee_id, phone, password_hash, role, active)
         VALUES ((SELECT id FROM employees WHERE code = '0088'), '0985040797', ?, 'hr', 1)
         ON CONFLICT(phone) DO UPDATE SET
           employee_id = excluded.employee_id,
           password_hash = excluded.password_hash,
           role = excluded.role,
           active = 1,
           updated_at = datetime('now')`,
      ).bind(defaultPasswordHash).run();
      await env.DB.prepare(
        `INSERT INTO users (employee_id, phone, password_hash, role, active)
         VALUES ((SELECT id FROM employees WHERE code = 'IT-001'), '0937454099', ?, 'super', 1)
         ON CONFLICT(phone) DO UPDATE SET
           employee_id = excluded.employee_id,
           password_hash = excluded.password_hash,
           role = excluded.role,
           active = 1,
           updated_at = datetime('now')`,
      ).bind(defaultPasswordHash).run();
    },
  },
  {
    id: "021_ensure_it_employee_link",
    run: async (env) => {
      await env.DB.prepare(
        `INSERT INTO employees (code, name, phone, position, status)
         VALUES ('IT-001', '_Huy (IT)', '0937454099', 'Quản trị hệ thống', 'Đang làm việc')
         ON CONFLICT(code) DO UPDATE SET
           name = excluded.name,
           phone = excluded.phone,
           position = excluded.position,
           status = excluded.status,
           updated_at = datetime('now')`,
      ).run();
      await env.DB.prepare(
        `UPDATE users
         SET employee_id = (SELECT id FROM employees WHERE code = 'IT-001'),
             updated_at = datetime('now')
         WHERE phone = '0937454099'`,
      ).run();
    },
  },
];

/** Áp các bước migrate còn thiếu (một lần cho mỗi isolate). */
export async function ensureSchema(env: Env): Promise<void> {
  if (ensured) return;
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))",
  );
  const done = await env.DB.prepare("SELECT id FROM schema_migrations").all<{ id: string }>();
  const applied = new Set(done.results.map((r) => r.id));
  for (const step of STEPS) {
    if (applied.has(step.id)) continue;
    await step.run(env);
    await env.DB.prepare("INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)")
      .bind(step.id)
      .run();
  }
  ensured = true;
}
