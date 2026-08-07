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

/** Phép năm được cấp: 12 ngày cơ bản + 1 ngày cho mỗi 5 năm thâm niên. */
function annualEntitlement(joinDate: string | null | undefined, now: Date): number {
  const base = 12;
  if (!joinDate) return base;
  const start = new Date(joinDate);
  if (Number.isNaN(start.getTime())) return base;
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years -= 1;
  return base + Math.floor(Math.max(0, years) / 5);
}

/**
 * Số dư phép năm tính TRỰC TIẾP từ dữ liệu nguồn (không phụ thuộc bộ đếm
 * leave_balances vốn cộng nhầm cả phép khác loại):
 *   - entitled: theo thâm niên từ ngày vào làm.
 *   - used   : tổng ngày đơn PN (phép năm) đã duyệt xong trong năm.
 *   - pending: tổng ngày đơn PN đang chờ duyệt trong năm.
 *   - carried: chuyển kỳ từ bảng leave_balances nếu có, mặc định 0.
 */
export async function getLeaveBalance(_request: Request, env: Env, employeeId: string): Promise<Response> {
  const now = new Date();
  const year = now.getFullYear();

  const emp = await env.DB.prepare("SELECT join_date FROM employees WHERE id = ?")
    .bind(employeeId)
    .first<{ join_date: string | null }>();
  if (!emp) return error("Không tìm thấy nhân viên", 404);

  const agg = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END), 0) AS used,
       COALESCE(SUM(CASE WHEN status IN ('pending', 'approved_l1') THEN days ELSE 0 END), 0) AS pending
     FROM leave_requests
     WHERE employee_id = ? AND type_code = 'PN'
       AND CAST(strftime('%Y', from_date) AS INTEGER) = ?`
  )
    .bind(employeeId, year)
    .first<{ used: number; pending: number }>();

  const stored = await env.DB.prepare(
    "SELECT carried FROM leave_balances WHERE employee_id = ? AND year = ?"
  )
    .bind(employeeId, year)
    .first<{ carried: number }>();

  const entitled = annualEntitlement(emp.join_date, now);
  const carried = stored?.carried ?? 0;
  const used = agg?.used ?? 0;
  const pending = agg?.pending ?? 0;
  const remaining = entitled + carried - used;

  return json({
    data: {
      employee_id: Number(employeeId),
      year,
      entitled,
      carried,
      used,
      pending,
      remaining,
    },
  });
}
