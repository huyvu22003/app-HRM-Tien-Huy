import type { Env } from "../middleware/auth";
import { json, error, readJson, getParams } from "../utils";

export async function listLeaveRequests(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = getParams(url);
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (params.employeeId) {
    conditions.push("lr.employee_id = ?");
    args.push(params.employeeId);
  }
  if (params.status) {
    conditions.push("lr.status = ?");
    args.push(params.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { results } = await env.DB.prepare(
    `SELECT lr.*, e.name as employee_name, e.code as employee_code
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     ${where}
     ORDER BY lr.created_at DESC`
  )
    .bind(...args)
    .all();

  return json({ data: results });
}

interface LeaveRequestBody {
  employeeId?: number;
  typeCode?: string;
  fromDate?: string;
  toDate?: string;
  days?: number;
  reason?: string;
}

export async function createLeaveRequest(request: Request, env: Env, userId: number): Promise<Response> {
  const body = await readJson<LeaveRequestBody>(request);
  if (!body.employeeId || !body.typeCode || !body.fromDate || !body.toDate || body.days === undefined) {
    return error("Thiếu thông tin đơn nghỉ phép", 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO leave_requests (employee_id, type_code, from_date, to_date, days, reason, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(body.employeeId, body.typeCode, body.fromDate, body.toDate, body.days, body.reason ?? null, userId)
    .run();

  await env.DB.prepare(
    `UPDATE leave_balances SET pending = pending + ?
     WHERE employee_id = ? AND year = CAST(strftime('%Y', ?) AS INTEGER)`
  )
    .bind(body.days, body.employeeId, body.fromDate)
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}

interface LeaveApprovalBody {
  action?: "approve" | "reject";
  step?: 1 | 2;
}

export async function updateLeaveRequest(
  request: Request,
  env: Env,
  id: string,
  userId: number
): Promise<Response> {
  const body = await readJson<LeaveApprovalBody>(request);
  const leave = await env.DB.prepare("SELECT * FROM leave_requests WHERE id = ?").bind(id).first<{
    employee_id: number;
    days: number;
    from_date: string;
    status: string;
  }>();
  if (!leave) return error("Không tìm thấy đơn nghỉ phép", 404);

  if (body.action === "reject") {
    await env.DB.prepare("UPDATE leave_requests SET status = 'rejected' WHERE id = ?").bind(id).run();
    await env.DB.prepare(
      `UPDATE leave_balances SET pending = MAX(0, pending - ?)
       WHERE employee_id = ? AND year = CAST(strftime('%Y', ?) AS INTEGER)`
    )
      .bind(leave.days, leave.employee_id, leave.from_date)
      .run();
    return json({ success: true, status: "rejected" });
  }

  if (body.action === "approve") {
    const step = body.step ?? 1;
    if (step === 1) {
      await env.DB.prepare(
        "UPDATE leave_requests SET status = 'approved_l1', current_step = 2, approved_l1_by = ?, approved_l1_at = datetime('now') WHERE id = ?"
      )
        .bind(userId, id)
        .run();
      return json({ success: true, status: "approved_l1" });
    }

    await env.DB.prepare(
      "UPDATE leave_requests SET status = 'approved', approved_l2_by = ?, approved_l2_at = datetime('now') WHERE id = ?"
    )
      .bind(userId, id)
      .run();

    await env.DB.prepare(
      `UPDATE leave_balances SET used = used + ?, pending = MAX(0, pending - ?)
       WHERE employee_id = ? AND year = CAST(strftime('%Y', ?) AS INTEGER)`
    )
      .bind(leave.days, leave.days, leave.employee_id, leave.from_date)
      .run();

    return json({ success: true, status: "approved" });
  }

  return error("Thiếu tham số action (approve|reject)", 400);
}

export async function getLeaveBalance(_request: Request, env: Env, employeeId: string): Promise<Response> {
  const year = new Date().getFullYear();
  const balance = await env.DB.prepare(
    "SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?"
  )
    .bind(employeeId, year)
    .first();

  if (!balance) return error("Không tìm thấy dữ liệu phép năm", 404);
  return json({ data: balance });
}
