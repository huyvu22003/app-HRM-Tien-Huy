"use client";

import { useEffect, useState } from "react";
import {
  Bell, ScanFace, ChevronRight, CalendarCheck, Palmtree, Target,
  Fingerprint, CalendarDays, Wallet, FileText, CalendarClock, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import { fetchAttendance, fetchLeaveBalance, fetchKpi, fetchLeaveRequests, fetchTodayCheckin, fetchNotifications } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { MCard, MBadge, mono } from "./primitives";
import { type Go, type MobileScreen, currentPeriod, todayLabel } from "./nav";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const QUICK: { key: MobileScreen; label: string; icon: typeof Fingerprint; bg: string; color: string }[] = [
  { key: "checkin", label: "Chấm công", icon: Fingerprint, bg: "#e8f0fb", color: "var(--color-accent)" },
  { key: "leave", label: "Nghỉ phép", icon: CalendarDays, bg: "#e7f4ec", color: "var(--color-success)" },
  { key: "salary", label: "Phiếu lương", icon: Wallet, bg: "#faf0e6", color: "var(--color-warning)" },
  { key: "report", label: "Báo cáo", icon: FileText, bg: "#f4e8f1", color: "var(--color-maternity)" },
];

export function MobileHome({ go }: { go: Go }) {
  const { user } = useAuth();
  const clock = useClock();
  const period = currentPeriod();
  const empId = user?.employeeId ?? null;
  const isManager = user?.role === "super" || user?.role === "hr" || user?.role === "lead";

  const { data: att } = useQuery(empId ? () => fetchAttendance(period) : null, [empId, period]);
  const { data: bal } = useQuery(empId ? () => fetchLeaveBalance(empId) : null, [empId]);
  const { data: kpi } = useQuery(empId ? () => fetchKpi(period) : null, [empId, period]);
  const { data: leaves } = useQuery(isManager ? () => fetchLeaveRequests() : null, [isManager]);
  const { data: ci } = useQuery(empId ? () => fetchTodayCheckin() : null, [empId]);
  const { data: notif } = useQuery(() => fetchNotifications(), []);
  const unread = notif?.unread ?? 0;

  const checkin = ci?.data ?? null;
  const checkinLabel = checkin?.time_in && checkin?.time_out
    ? `Đã chấm công đủ · ${checkin.time_in}–${checkin.time_out}`
    : checkin?.time_in
      ? `Đã vào lúc ${checkin.time_in} · bấm để chấm ra`
      : "Chưa chấm công vào";

  const myAtt = att?.data?.find((r) => r.employee_id === empId);
  const myKpi = kpi?.data?.find((k) => k.employee_id === empId);
  const pending = (leaves?.data ?? []).filter((r) => r.status === "pending");

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 bg-white px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 14px)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--color-navy)] text-[15px] font-bold text-white">{getInitials(user?.name ?? "")}</div>
            <div>
              <div className="text-[12.5px] text-[var(--color-text-muted)]">Xin chào,</div>
              <div className="text-[16px] font-bold leading-tight text-[var(--color-text-primary)]">{user?.name ?? "Nhân viên"}</div>
            </div>
          </div>
          <button onClick={() => go("notifications")} className="relative flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#f2f5f9] text-[var(--color-text-secondary)]">
            <Bell size={20} />
            {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-[var(--color-danger)]" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-1.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 96px)" }}>
        <div className="flex flex-col gap-3.5">
          {/* Check-in hero */}
          <button
            onClick={() => go("checkin")}
            className="rounded-[20px] p-[18px] text-left text-white shadow-[0_12px_24px_rgba(15,47,90,0.25)]"
            style={{ background: "linear-gradient(135deg,#0f2f5a,#1e6fd0)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-white/75">{todayLabel()}</div>
                <div className="mt-0.5 text-[14px] font-semibold">{checkinLabel}</div>
              </div>
              <div className={`${mono} text-[28px] font-bold`}>{clock}</div>
            </div>
            <div className="mt-3.5 flex items-center gap-2.5 rounded-[14px] bg-white/15 p-3">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-white/90"><ScanFace size={24} className="text-[var(--color-navy)]" /></div>
              <div className="flex-1">
                <div className="text-[14px] font-bold">Chấm công bằng selfie</div>
                <div className="text-[11.5px] text-white/80">Xác thực khuôn mặt &amp; vị trí xưởng</div>
              </div>
              <ChevronRight size={20} className="text-white/85" />
            </div>
          </button>

          {/* Quick stats */}
          <div className="flex gap-2.5">
            <MCard className="flex-1 p-3">
              <CalendarCheck size={18} className="text-[var(--color-accent)]" />
              <div className={`${mono} mt-1.5 text-[19px] font-bold`}>{myAtt?.actual_days ?? "—"}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Công tháng</div>
            </MCard>
            <MCard className="flex-1 p-3">
              <Palmtree size={18} className="text-[var(--color-success)]" />
              <div className={`${mono} mt-1.5 text-[19px] font-bold`}>{bal?.data ? bal.data.remaining : "—"}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Phép còn lại</div>
            </MCard>
            <MCard className="flex-1 p-3">
              <Target size={18} className="text-[var(--color-warning)]" />
              <div className={`${mono} mt-1.5 text-[19px] font-bold`}>{myKpi ? myKpi.score.toFixed(1) : "—"}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">KPI tháng</div>
            </MCard>
          </div>

          {/* Quick access */}
          <div>
            <div className="mb-2.5 px-0.5 text-[13.5px] font-bold text-[var(--color-text-primary)]">Truy cập nhanh</div>
            <div className="grid grid-cols-4 gap-2.5">
              {QUICK.map((q) => (
                <button key={q.label} onClick={() => go(q.key)} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px]" style={{ background: q.bg }}>
                    <q.icon size={24} style={{ color: q.color }} />
                  </div>
                  <div className="text-center text-[11px] font-semibold text-[var(--color-text-secondary)]">{q.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cần xử lý (quản lý) */}
          {isManager && (
            <MCard className="px-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border-light)] py-3">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-[var(--color-text-primary)]">
                  Cần xử lý {pending.length > 0 && <MBadge tone="danger">{pending.length}</MBadge>}
                </div>
                <button onClick={() => go("approvals")} className="text-[12px] font-semibold text-[var(--color-accent)]">Xem tất cả</button>
              </div>
              {pending.length === 0 ? (
                <div className="py-4 text-[12.5px] text-[var(--color-text-muted)]">Không có đơn nào chờ xử lý.</div>
              ) : (
                pending.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => go("approvals")} className="flex w-full items-center gap-3 border-b border-[var(--color-border-light)] py-2.5 text-left last:border-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-warning-bg)]"><CalendarClock size={18} className="text-[var(--color-warning)]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[var(--color-text-secondary)]">Đơn nghỉ chờ duyệt</div>
                      <div className="truncate text-[11.5px] text-[var(--color-text-muted)]">{r.employee_name} · {r.days} ngày</div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--color-text-lighter)]" />
                  </button>
                ))
              )}
            </MCard>
          )}

          {!empId && (
            <MCard className="flex items-center gap-2.5 p-3.5">
              <AlertTriangle size={18} className="flex-none text-[var(--color-warning)]" />
              <div className="text-[12px] text-[var(--color-text-muted)]">Tài khoản chưa gắn nhân viên nên một số số liệu cá nhân chưa hiển thị.</div>
            </MCard>
          )}
        </div>
      </div>
    </div>
  );
}
