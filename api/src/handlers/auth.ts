import type { Env } from "../middleware/auth";
import { createToken, verifyPassword, authMiddleware } from "../middleware/auth";
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
    "SELECT id, employee_id, phone, password_hash, role, active FROM users WHERE phone = ?"
  )
    .bind(body.phone)
    .first<{
      id: number;
      employee_id: number | null;
      phone: string;
      password_hash: string;
      role: string;
      active: number;
    }>();

  if (!user || !user.active) {
    return error("Tài khoản không tồn tại hoặc đã bị khóa", 401);
  }

  const validPassword = await verifyPassword(body.password, user.password_hash);
  if (!validPassword) {
    return error("Số điện thoại hoặc mật khẩu không đúng", 401);
  }

  const token = await createToken(user.id, user.role, env.JWT_SECRET);

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
      role: user.role,
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
    `SELECT u.id, u.employee_id, u.phone, u.role, e.name, e.department_id, e.position, e.photo_url
     FROM users u LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ?`
  )
    .bind(auth.userId)
    .first();

  if (!user) return error("Không tìm thấy người dùng", 404);

  return json({ user });
}
