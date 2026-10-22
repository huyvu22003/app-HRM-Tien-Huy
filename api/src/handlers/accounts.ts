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

const ROLES = new Set(["super", "hr", "lead", "staff"]);

export async function listAccounts(_request: Request, env: Env): Promise<Response> {
  const accounts = await env.DB.prepare(
    `SELECT u.id, u.employee_id, u.phone, u.role, u.active, u.created_at, u.updated_at,
            e.code AS employee_code, e.name AS employee_name, e.phone AS employee_phone,
            e.position AS employee_position, e.status AS employee_status
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY u.active DESC, COALESCE(e.name, u.phone)`,
  ).all();
  const unlinkedEmployees = await env.DB.prepare(
    `SELECT e.id, e.code, e.name, e.phone, e.position, e.status
     FROM employees e
     LEFT JOIN users u ON u.employee_id = e.id
     WHERE u.id IS NULL
     ORDER BY e.name`,
  ).all();
  return json({ accounts: accounts.results, employeesWithoutAccount: unlinkedEmployees.results });
}

export async function createAccount(request: Request, env: Env): Promise<Response> {
  const body = await readJson<AccountBody>(request);
  const phone = body.phone?.replace(/\s+/g, "");
  if (!body.employeeId || !phone || !body.password || !body.role) return error("Thiếu nhân viên, số điện thoại, mật khẩu hoặc vai trò", 400);
  if (!ROLES.has(body.role)) return error("Vai trò không hợp lệ", 400);
  if (body.password.length < 8) return error("Mật khẩu phải có ít nhất 8 ký tự", 400);

  const employee = await env.DB.prepare("SELECT id FROM employees WHERE id = ?").bind(body.employeeId).first();
  if (!employee) return error("Không tìm thấy nhân viên", 404);
  const duplicate = await env.DB.prepare("SELECT id FROM users WHERE phone = ? OR employee_id = ?").bind(phone, body.employeeId).first();
  if (duplicate) return error("Số điện thoại hoặc nhân viên đã có tài khoản", 409);

  const passwordHash = await hashPassword(body.password);
  const result = await env.DB.prepare(
    "INSERT INTO users (employee_id, phone, password_hash, role, active) VALUES (?, ?, ?, ?, ?)",
  ).bind(body.employeeId, phone, passwordHash, body.role, body.active === false ? 0 : 1).run();
  return json({ success: true, id: result.meta.last_row_id }, 201);
}

export async function updateAccount(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<AccountBody>(request);
  const current = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
  if (!current) return error("Không tìm thấy tài khoản", 404);
  if (body.role && !ROLES.has(body.role)) return error("Vai trò không hợp lệ", 400);
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
  if (body.password !== undefined) { fields.push("password_hash = ?"); values.push(await hashPassword(body.password)); }
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
