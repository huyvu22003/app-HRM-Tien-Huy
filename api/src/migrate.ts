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
