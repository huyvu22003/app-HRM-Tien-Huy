import type { Env } from "../middleware/auth";
import { createToken, hashPassword, verifyPassword, authMiddleware, effectiveRole } from "../middleware/auth";
import { json, error, readJson } from "../utils";

interface LoginBody {
  phone?: string;
  password?: string;
}

export async function login(request: Request, env: Env): Promise<Response> {
  const body = await readJson<LoginBody>(request);
  if (!body.phone || !body.password) {
    return error("Vui lòng nhập số điện thoại và mật khẩu", 400);
  }

  const user = await env.DB.prepare(
    "SELECT id, employee_id, phone, password_hash, role, account_type, display_name, title, active, COALESCE(must_change_password, 0) AS must_change_password, COALESCE(token_version, 0) AS token_version, temporary_password_expires_at FROM users WHERE phone = ?"
  )
    .bind(body.phone)
    .first<{
      id: number;
      employee_id: number | null;
      phone: string;
      password_hash: string;
      role: string;
      account_type: string | null;
      display_name: string | null;
      title: string | null;
      active: number;
      must_change_password: number;
      token_version: number;
      temporary_password_expires_at: string | null;
    }>();

  if (!user || !user.active) {
    return error("Tài khoản không tồn tại hoặc đã bị khóa", 401);
  }

  const validPassword = await verifyPassword(body.password, user.password_hash);
  if (!validPassword) {
    return error("Số điện thoại hoặc mật khẩu không đúng", 401);
  }

  if (user.must_change_password && user.temporary_password_expires_at && user.temporary_password_expires_at < new Date().toISOString()) {
    return error("Mật khẩu tạm đã hết hạn. Vui lòng liên hệ HR để đặt lại.", 401);
  }

  const role = effectiveRole(user.role, user.account_type);
  const token = await createToken(user.id, role, env.JWT_SECRET, user.token_version);

  await env.DB.prepare(
    "INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'login', 'users', ?)"
  )
    .bind(user.id, String(user.id))
    .run();

  return json({
    token,
    user: {
      id: user.id,
      employeeId: user.employee_id,
      phone: user.phone,
      role,
      name: user.display_name,
      position: user.title,
      mustChangePassword: Boolean(user.must_change_password),
    },
  });
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const auth = await authMiddleware(request, env);
  if (!auth) return error("Unauthorized", 401);

  await env.DB.prepare(
    "INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'logout', 'users', ?)"
  )
    .bind(auth.userId, String(auth.userId))
    .run();

  return json({ success: true });
}

export async function me(request: Request, env: Env): Promise<Response> {
  const auth = await authMiddleware(request, env);
  if (!auth) return error("Unauthorized", 401);

  const user = await env.DB.prepare(
    `SELECT u.id, u.employee_id, u.phone,
            CASE WHEN u.account_type = 'director' THEN 'director' ELSE u.role END AS role,
            u.must_change_password, COALESCE(e.name, u.display_name) AS name,
            e.department_id, COALESCE(e.position, u.title) AS position, e.photo_url
     FROM users u LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ?`
  )
    .bind(auth.userId)
    .first();

  if (!user) return error("Không tìm thấy người dùng", 404);

  return json({ user });
}

export async function changePassword(request: Request, env: Env): Promise<Response> {
  const auth = await authMiddleware(request, env);
  if (!auth) return error("Unauthorized", 401);
  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
  if (!body.currentPassword || !body.newPassword) return error("Thiếu mật khẩu hiện tại hoặc mật khẩu mới", 400);
  if (body.newPassword.length < 8) return error("Mật khẩu mới phải có ít nhất 8 ký tự", 400);
  if (body.currentPassword === body.newPassword) return error("Mật khẩu mới phải khác mật khẩu hiện tại", 400);

  const user = await env.DB.prepare("SELECT id, role, account_type, password_hash, COALESCE(token_version, 0) AS token_version FROM users WHERE id = ?")
    .bind(auth.userId).first<{ id: number; role: string; account_type: string | null; password_hash: string; token_version: number }>();
  if (!user || !(await verifyPassword(body.currentPassword, user.password_hash))) return error("Mật khẩu hiện tại không đúng", 401);

  const passwordHash = await hashPassword(body.newPassword);
  const nextVersion = user.token_version + 1;
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0, temporary_password_expires_at = NULL,
     password_changed_at = datetime('now'), token_version = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(passwordHash, nextVersion, user.id).run();
  await env.DB.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'change_password', 'users', ?)")
    .bind(user.id, String(user.id)).run();
  const token = await createToken(user.id, effectiveRole(user.role, user.account_type), env.JWT_SECRET, nextVersion);
  return json({ success: true, token });
}
