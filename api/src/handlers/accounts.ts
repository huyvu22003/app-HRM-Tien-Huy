import type { Env } from "../middleware/auth";
import { hashPassword } from "../middleware/auth";
import { error, json, readJson } from "../utils";

type AccountBody = {
  employeeId?: number | null;
  phone?: string;
  password?: string;
  role?: "super" | "hr" | "lead" | "staff";
  active?: boolean;
};

type AccountRole = "super" | "hr" | "lead" | "staff";

type ProvisioningEmployee = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  position: string | null;
  level: string | null;
  department_name: string | null;
};

const ROLES = new Set(["super", "hr", "lead", "staff"]);
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length]).join("");
}

export function inferAccountRole(employee: Pick<ProvisioningEmployee, "department_name" | "position" | "level">): AccountRole {
  const department = (employee.department_name ?? "").toLocaleLowerCase("vi");
  const management = `${employee.position ?? ""} ${employee.level ?? ""}`.toLocaleLowerCase("vi");
  if (/nhân\s*sự|nhan\s*su/.test(department)) return "hr";
  if (/(giám đốc|phó giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/.test(management)) return "lead";
  return "staff";
}

function normalizePhone(phone: string | null): string {
  return (phone ?? "").replace(/\s+/g, "");
}

function isValidEmployeePhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone);
}

export async function listAccounts(_request: Request, env: Env): Promise<Response> {
  const accounts = await env.DB.prepare(
    `SELECT u.id, u.employee_id, u.phone, u.role, u.active, u.must_change_password,
            u.password_changed_at, u.temporary_password_expires_at, u.created_at, u.updated_at,
            e.code AS employee_code, e.name AS employee_name, e.phone AS employee_phone,
            e.position AS employee_position, e.status AS employee_status
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY u.active DESC, COALESCE(e.name, u.phone)`,
  ).all();
  const unlinkedEmployees = await env.DB.prepare(
    `SELECT e.id, e.code, e.name, e.phone, e.position, e.level, e.status,
            d.name AS department_name
     FROM employees e
     LEFT JOIN users u ON u.employee_id = e.id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE u.id IS NULL
     ORDER BY e.name`,
  ).all();
  return json({ accounts: accounts.results, employeesWithoutAccount: unlinkedEmployees.results });
}

export async function syncEmployeeAccounts(env: Env, actorUserId: number): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT e.id, e.code, e.name, e.phone, e.position, e.level, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN users linked ON linked.employee_id = e.id
     WHERE linked.id IS NULL AND e.status = 'Đang làm việc'
     ORDER BY e.name`,
  ).all<ProvisioningEmployee>();
  const existingPhones = await env.DB.prepare("SELECT phone FROM users").all<{ phone: string }>();
  const reservedPhones = new Set(existingPhones.results.map((row) => normalizePhone(row.phone)));
  const eligible: Array<ProvisioningEmployee & { normalizedPhone: string; role: AccountRole }> = [];
  const skipped: Array<{ employeeId: number; employeeCode: string; employeeName: string; reason: string }> = [];

  for (const employee of result.results) {
    const phone = normalizePhone(employee.phone);
    if (!isValidEmployeePhone(phone)) {
      skipped.push({ employeeId: employee.id, employeeCode: employee.code, employeeName: employee.name, reason: "Số điện thoại không hợp lệ hoặc còn thiếu" });
      continue;
    }
    if (reservedPhones.has(phone)) {
      skipped.push({ employeeId: employee.id, employeeCode: employee.code, employeeName: employee.name, reason: "Số điện thoại đã được tài khoản khác sử dụng" });
      continue;
    }
    reservedPhones.add(phone);
    eligible.push({ ...employee, normalizedPhone: phone, role: inferAccountRole(employee) });
  }

  const batch = eligible.slice(0, 20);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const credentials = await Promise.all(batch.map(async (employee) => {
    const temporaryPassword = generateTemporaryPassword();
    return { employee, temporaryPassword, passwordHash: await hashPassword(temporaryPassword) };
  }));

  if (credentials.length > 0) {
    await env.DB.batch(credentials.map(({ employee, passwordHash }) => env.DB.prepare(
      `INSERT INTO users (employee_id, phone, password_hash, role, active, must_change_password, temporary_password_expires_at)
       VALUES (?, ?, ?, ?, 1, 1, ?)`,
    ).bind(employee.id, employee.normalizedPhone, passwordHash, employee.role, expiresAt)));
    await env.DB.prepare(
      "INSERT INTO audit_log (user_id, action, entity, entity_id, after_data) VALUES (?, 'bulk_create_accounts', 'users', ?, ?)",
    ).bind(actorUserId, String(credentials.length), JSON.stringify({ employeeIds: credentials.map(({ employee }) => employee.id) })).run();
  }

  return json({
    success: true,
    created: credentials.map(({ employee, temporaryPassword }) => ({
      employeeId: employee.id,
      employeeCode: employee.code,
      employeeName: employee.name,
      phone: employee.normalizedPhone,
      role: employee.role,
      temporaryPassword,
      expiresAt,
    })),
    skipped,
    remaining: Math.max(0, eligible.length - batch.length),
  });
}

export async function createAccount(request: Request, env: Env, actorRole: string): Promise<Response> {
  const body = await readJson<AccountBody>(request);
  const phone = body.phone?.replace(/\s+/g, "");
  if (!body.employeeId || !phone || !body.role) return error("Thiếu nhân viên, số điện thoại hoặc vai trò", 400);
  if (!ROLES.has(body.role)) return error("Vai trò không hợp lệ", 400);
  if (actorRole === "hr" && !["lead", "staff"].includes(body.role)) return error("HR chỉ được cấp tài khoản tổ trưởng hoặc nhân viên", 403);
  if (body.password !== undefined && body.password.length < 8) return error("Mật khẩu phải có ít nhất 8 ký tự", 400);

  const employee = await env.DB.prepare("SELECT id FROM employees WHERE id = ?").bind(body.employeeId).first();
  if (!employee) return error("Không tìm thấy nhân viên", 404);
  const duplicate = await env.DB.prepare("SELECT id FROM users WHERE phone = ? OR employee_id = ?").bind(phone, body.employeeId).first();
  if (duplicate) return error("Số điện thoại hoặc nhân viên đã có tài khoản", 409);

  const temporaryPassword = body.password ?? generateTemporaryPassword();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const passwordHash = await hashPassword(temporaryPassword);
  const result = await env.DB.prepare(
    `INSERT INTO users (employee_id, phone, password_hash, role, active, must_change_password, temporary_password_expires_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
  ).bind(body.employeeId, phone, passwordHash, body.role, body.active === false ? 0 : 1, expiresAt).run();
  return json({ success: true, id: result.meta.last_row_id, temporaryPassword, expiresAt }, 201);
}

export async function updateAccount(request: Request, env: Env, id: string, actorRole: string): Promise<Response> {
  const body = await readJson<AccountBody>(request);
  const current = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first<{ id: number; role: string }>();
  if (!current) return error("Không tìm thấy tài khoản", 404);
  if (body.role && !ROLES.has(body.role)) return error("Vai trò không hợp lệ", 400);
  if (actorRole === "hr" && (!["lead", "staff"].includes(current.role) || (body.role && !["lead", "staff"].includes(body.role)))) {
    return error("HR chỉ được quản trị tài khoản tổ trưởng hoặc nhân viên", 403);
  }
  if (body.password !== undefined && body.password.length < 8) return error("Mật khẩu phải có ít nhất 8 ký tự", 400);

  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.employeeId !== undefined) {
    if (body.employeeId !== null) {
      const employee = await env.DB.prepare("SELECT id FROM employees WHERE id = ?").bind(body.employeeId).first();
      if (!employee) return error("Không tìm thấy nhân viên", 404);
      const duplicate = await env.DB.prepare("SELECT id FROM users WHERE employee_id = ? AND id <> ?").bind(body.employeeId, id).first();
      if (duplicate) return error("Nhân viên đã gắn với tài khoản khác", 409);
    }
    fields.push("employee_id = ?"); values.push(body.employeeId);
  }
  if (body.phone !== undefined) {
    const phone = body.phone.replace(/\s+/g, "");
    if (!phone) return error("Số điện thoại không hợp lệ", 400);
    fields.push("phone = ?"); values.push(phone);
  }
  if (body.role !== undefined) { fields.push("role = ?"); values.push(body.role); }
  if (body.active !== undefined) { fields.push("active = ?"); values.push(body.active ? 1 : 0); }
  if (body.password !== undefined) {
    fields.push("password_hash = ?", "must_change_password = 1", "temporary_password_expires_at = ?", "token_version = COALESCE(token_version, 0) + 1");
    values.push(await hashPassword(body.password), new Date(Date.now() + 30 * 60 * 1000).toISOString());
  }
  if (fields.length === 0) return error("Không có dữ liệu cập nhật", 400);
  fields.push("updated_at = datetime('now')");

  try {
    await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id).run();
  } catch (err) {
    if (String(err).includes("UNIQUE")) return error("Số điện thoại đã được sử dụng", 409);
    throw err;
  }
  return json({ success: true });
}

export async function resetAccountPassword(_request: Request, env: Env, id: string, actorUserId: number): Promise<Response> {
  const actor = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(actorUserId).first<{ id: number; role: string }>();
  const account = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first<{ id: number; role: string }>();
  if (!account) return error("Không tìm thấy tài khoản", 404);
  if (!actor) return error("Không tìm thấy tài khoản quản trị", 401);
  if (actor.id === account.id) return error("Không thể tự đặt lại mật khẩu bằng chức năng quản trị. Hãy dùng Đổi mật khẩu.", 403);
  if (actor.role === "hr" && !["lead", "staff"].includes(account.role)) {
    return error("HR chỉ được đặt lại mật khẩu cho tổ trưởng và nhân viên.", 403);
  }
  if (actor.role === "super" && account.role === "super") {
    return error("Tài khoản quản trị cấp cao phải được phục hồi qua quy trình Admin an toàn.", 403);
  }
  const temporaryPassword = generateTemporaryPassword();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const passwordHash = await hashPassword(temporaryPassword);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 1, temporary_password_expires_at = ?,
     token_version = COALESCE(token_version, 0) + 1, updated_at = datetime('now') WHERE id = ?`,
  ).bind(passwordHash, expiresAt, id).run();
  await env.DB.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'reset_password', 'users', ?)")
    .bind(actorUserId, id).run();
  return json({ success: true, temporaryPassword, expiresAt });
}
