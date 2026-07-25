import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";

export async function listEmployees(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize || "20", 10) || 20));
  const search = (params.search || params.q || "").trim();
  const departmentId = params.departmentId || params.department;

  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push("(e.name LIKE ? OR e.code LIKE ? OR e.phone LIKE ?)");
    const like = `%${search}%`;
    args.push(like, like, like);
  }
  if (departmentId) {
    conditions.push("e.department_id = ?");
    args.push(departmentId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM employees e ${where}`
  )
    .bind(...args)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (Math.min(page, totalPages) - 1) * pageSize;

  const { results } = await env.DB.prepare(
    `SELECT e.*, d.name as department_name, manager_employee.name as manager_name,
            c.dependents, c.base_salary, c.allowance,
            ins.status as ins_status, ins.salary_base as ins_salary_base
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees manager_employee ON manager_employee.id = e.manager_employee_id
     LEFT JOIN compensation c ON c.employee_id = e.id
     LEFT JOIN insurance ins ON ins.employee_id = e.id
     ${where}
     ORDER BY e.id
     LIMIT ? OFFSET ?`
  )
    .bind(...args, pageSize, offset)
    .all();

  return json({ data: results, total, page, pageSize, totalPages });
}

export async function getEmployee(request: Request, env: Env, id: string): Promise<Response> {
  const employee = await env.DB.prepare(
    `SELECT e.*, d.name as department_name, manager_employee.name as manager_name
     FROM employees e LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN employees manager_employee ON manager_employee.id = e.manager_employee_id
     WHERE e.id = ?`
  )
    .bind(id)
    .first();
  if (!employee) return error("Không tìm thấy nhân viên", 404);

  const compensation = await env.DB.prepare("SELECT * FROM compensation WHERE employee_id = ?")
    .bind(id)
    .first();
  const insurance = await env.DB.prepare("SELECT * FROM insurance WHERE employee_id = ?")
    .bind(id)
    .first();

  return json({ employee, compensation, insurance });
}

interface CompensationBody {
  baseSalary?: number;
  allowance?: number;
  dependents?: number;
}

interface InsuranceBody {
  status?: string;
  insCode?: string;
  bhxhBook?: string;
  bhytCode?: string;
  bhytClinic?: string;
  startDate?: string;
  salaryBase?: number;
}

interface EmployeeBody {
  code?: string;
  name?: string;
  gender?: string;
  dob?: string;
  phone?: string;
  cccd?: string;
  address?: string;
  email?: string;
  departmentId?: number | null;
  departmentName?: string;
  position?: string;
  workplace?: string;
  contractType?: string;
  contractEnd?: string;
  joinDate?: string;
  status?: string;
  manager?: string;
  level?: string;
  bank?: string;
  taxCode?: string;
  compensation?: CompensationBody;
  insurance?: InsuranceBody;
}

export async function createEmployee(request: Request, env: Env): Promise<Response> {
  const body = await readJson<EmployeeBody>(request);
  if (!body.code || !body.name) {
    return error("Thiếu mã nhân viên hoặc họ tên", 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO employees
      (code, name, gender, dob, phone, cccd, address, email, department_id, position,
       workplace, contract_type, contract_end, join_date, status, manager, level, bank, tax_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.code,
      body.name,
      body.gender ?? null,
      body.dob ?? null,
      body.phone ?? null,
      body.cccd ?? null,
      body.address ?? null,
      body.email ?? null,
      body.departmentId ?? null,
      body.position ?? null,
      body.workplace ?? null,
      body.contractType ?? null,
      body.contractEnd ?? null,
      body.joinDate ?? null,
      body.status ?? "Đang làm việc",
      body.manager ?? null,
      body.level ?? null,
      body.bank ?? null,
      body.taxCode ?? null
    )
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function importEmployees(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ employees?: Array<Record<string, unknown>> }>(request);
  const rows = Array.isArray(body.employees) ? body.employees : [];
  let created = 0;
  let updated = 0;

  for (const r of rows) {
    const code = String(r.code ?? "").trim();
    const name = String(r.name ?? "").trim();
    if (!code || !name) continue;

    // Resolve department by name
    let departmentId: number | null = null;
    const deptName = String(r.department_name ?? r.department ?? "").trim();
    if (deptName) {
      const dept = await env.DB.prepare("SELECT id FROM departments WHERE name = ?")
        .bind(deptName)
        .first<{ id: number }>();
      departmentId = dept?.id ?? null;
    }

    const existing = await env.DB.prepare("SELECT id FROM employees WHERE code = ?")
      .bind(code)
      .first<{ id: number }>();

    // Chỉ nhận field CÓ MẶT trong dòng import (tránh ghi đè null lên dữ liệu cũ).
    const has = (k: string) => r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "";
    const strField = (k: string) => String(r[k]).trim();
    const cols: Record<string, unknown> = {};
    for (const k of ["gender", "dob", "phone", "cccd", "address", "email", "position",
                     "workplace", "contract_type", "contract_end", "join_date", "status",
                     "manager", "level", "bank", "tax_code"]) {
      if (has(k)) cols[k] = strField(k);
    }
    if (deptName) cols.department_id = departmentId;

    if (existing) {
      // name có thể đổi; luôn cho phép cập nhật name khi có.
      cols.name = name;
      const sets = Object.keys(cols).map((k) => `${k} = ?`).join(", ");
      if (sets) {
        await env.DB.prepare(`UPDATE employees SET ${sets} WHERE id = ?`)
          .bind(...Object.values(cols), existing.id)
          .run();
      }
      updated++;
    } else {
      const insertCols = { name, status: (cols.status as string) ?? "Đang làm việc", ...cols };
      const keys = ["code", ...Object.keys(insertCols)];
      const placeholders = keys.map(() => "?").join(", ");
      await env.DB.prepare(`INSERT INTO employees (${keys.join(", ")}) VALUES (${placeholders})`)
        .bind(code, ...Object.values(insertCols))
        .run();
      created++;
    }
  }

  return json({ success: true, created, updated });
}

export async function updateEmployee(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<EmployeeBody>(request);

  const existing = await env.DB.prepare("SELECT * FROM employees WHERE id = ?").bind(id).first();
  if (!existing) return error("Không tìm thấy nhân viên", 404);

  // Resolve department by name → id (falls back to explicit departmentId)
  let departmentId = body.departmentId;
  if (departmentId === undefined && body.departmentName !== undefined) {
    if (body.departmentName) {
      const dept = await env.DB.prepare("SELECT id FROM departments WHERE name = ?")
        .bind(body.departmentName)
        .first<{ id: number }>();
      departmentId = dept?.id ?? null;
    } else {
      departmentId = null;
    }
  }

  const fields: string[] = [];
  const args: unknown[] = [];
  const map: Record<string, unknown> = {
    code: body.code,
    name: body.name,
    gender: body.gender,
    dob: body.dob,
    phone: body.phone,
    cccd: body.cccd,
    address: body.address,
    email: body.email,
    department_id: departmentId,
    position: body.position,
    workplace: body.workplace,
    contract_type: body.contractType,
    contract_end: body.contractEnd,
    join_date: body.joinDate,
    status: body.status,
    manager: body.manager,
    level: body.level,
    bank: body.bank,
    tax_code: body.taxCode,
  };

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      args.push(value);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    args.push(id);
    await env.DB.prepare(`UPDATE employees SET ${fields.join(", ")} WHERE id = ?`)
      .bind(...args)
      .run();
  }

  // Upsert compensation (salary)
  if (body.compensation) {
    const c = body.compensation;
    await env.DB.prepare(
      `INSERT INTO compensation (employee_id, base_salary, allowance, dependents)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(employee_id) DO UPDATE SET
         base_salary = excluded.base_salary,
         allowance = excluded.allowance,
         dependents = excluded.dependents`
    )
      .bind(id, c.baseSalary ?? 0, c.allowance ?? 0, c.dependents ?? 0)
      .run();
  }

  // Upsert insurance
  if (body.insurance) {
    const ins = body.insurance;
    await env.DB.prepare(
      `INSERT INTO insurance (employee_id, status, ins_code, bhxh_book, bhyt_code, bhyt_clinic, start_date, salary_base)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(employee_id) DO UPDATE SET
         status = excluded.status,
         ins_code = excluded.ins_code,
         bhxh_book = excluded.bhxh_book,
         bhyt_code = excluded.bhyt_code,
         bhyt_clinic = excluded.bhyt_clinic,
         start_date = excluded.start_date,
         salary_base = excluded.salary_base`
    )
      .bind(
        id,
        ins.status ?? "Chưa tham gia",
        ins.insCode ?? null,
        ins.bhxhBook ?? null,
        ins.bhytCode ?? null,
        ins.bhytClinic ?? null,
        ins.startDate ?? null,
        ins.salaryBase ?? 0
      )
      .run();
  }

  await env.DB.prepare(
    `INSERT INTO audit_log (action, entity, entity_id, before_data, after_data)
     VALUES ('update', 'employees', ?, ?, ?)`
  )
    .bind(id, JSON.stringify(existing), JSON.stringify(body))
    .run();

  return json({ success: true });
}
