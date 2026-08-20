import type { Env } from "../middleware/auth";
import { json } from "../utils";

/**
 * Thông báo cho người đăng nhập, suy ra TỪ DỮ LIỆU THẬT (không bảng riêng):
 *   - Quản lý (lead/hr/super): đơn nghỉ đang chờ duyệt.
 *   - Nhân viên: đơn nghỉ của mình vừa được duyệt/từ chối; báo cáo ngày được duyệt.
 * `unread` = sự kiện trong 2 ngày gần nhất (heuristic, chưa lưu trạng thái đã đọc).
 */

const LEAVE_LABEL: Record<string, string> = { PN: "Phép năm", PB: "Phép bệnh", VR: "Việc riêng", PC: "Phép cưới", PT: "Phép tang", TNLD: "Tai nạn LĐ" };

interface Notif {
  id: string;
  kind: "leave_pending" | "leave_approved" | "leave_rejected";
  tone: "warning" | "success" | "danger" | "accent";
  title: string;
  body: string;
  at: string;
  unread: boolean;
}

function isRecent(at: string | null): boolean {
  if (!at) return false;
  const t = new Date(at.includes("T") ? at : at.replace(" ", "T") + "Z").getTime();
  return Number.isFinite(t) && Date.now() - t < 2 * 24 * 3600 * 1000;
}

export async function getNotifications(_request: Request, env: Env, userId: number, role: string): Promise<Response> {
  const out: Notif[] = [];
  const isManager = role === "super" || role === "hr" || role === "lead";

  if (isManager) {
    const { results } = await env.DB.prepare(
      `SELECT lr.id, lr.type_code, lr.days, lr.created_at, e.name AS employee_name
       FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
       WHERE lr.status = 'pending' ORDER BY lr.created_at DESC LIMIT 15`,
    ).all<{ id: number; type_code: string; days: number; created_at: string; employee_name: string }>();
    for (const r of results) {
      out.push({
        id: `lp-${r.id}`, kind: "leave_pending", tone: "warning",
        title: "Đơn nghỉ chờ duyệt",
        body: `${r.employee_name} xin ${LEAVE_LABEL[r.type_code] ?? r.type_code} ${r.days} ngày`,
        at: r.created_at, unread: isRecent(r.created_at),
      });
    }
  }

  const acc = await env.DB.prepare("SELECT employee_id FROM users WHERE id = ?").bind(userId).first<{ employee_id: number | null }>();
  const empId = acc?.employee_id ?? null;

  if (empId) {
    const { results } = await env.DB.prepare(
      `SELECT id, type_code, days, status, created_at,
              COALESCE(approved_l2_at, approved_l1_at, created_at) AS decided_at
       FROM leave_requests
       WHERE employee_id = ? AND status IN ('approved', 'approved_l1', 'approved_l2', 'rejected')
       ORDER BY decided_at DESC LIMIT 12`,
    ).bind(empId).all<{ id: number; type_code: string; days: number; status: string; decided_at: string }>();
    for (const r of results) {
      const rejected = r.status === "rejected";
      out.push({
        id: `ld-${r.id}`,
        kind: rejected ? "leave_rejected" : "leave_approved",
        tone: rejected ? "danger" : "success",
        title: rejected ? "Đơn nghỉ bị từ chối" : "Đơn nghỉ đã được duyệt",
        body: `${LEAVE_LABEL[r.type_code] ?? r.type_code} · ${r.days} ngày`,
        at: r.decided_at, unread: isRecent(r.decided_at),
      });
    }
  }

  out.sort((a, b) => (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0));
  return json({ data: out.slice(0, 30), unread: out.filter((n) => n.unread).length });
}
