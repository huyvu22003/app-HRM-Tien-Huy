"use client";

import { useState } from "react";
import {
  Check, X, Loader2, TrendingUp, TrendingDown, Download, Send, Award, Bell,
  CalendarClock, AlertTriangle, Target, UserPlus, Wallet, LogOut, ChevronRight,
  User as UserIcon, Shield, Phone, Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import {
  fetchLeaveRequests, updateLeaveRequest, fetchMySalary, fetchKpi, fetchRewards,
  fetchDailyReports, createDailyReport, type ApiLeaveRequest,
} from "@/lib/api";
import { formatMoney, formatDate, getInitials } from "@/lib/utils";
import { computeSalary } from "@/lib/salary-compute";
import { MCard, MHeader, MButton, MBadge, MBody, mono } from "./primitives";
import { type Go, currentPeriod, todayLabel } from "./nav";

const ROLE_LABEL: Record<string, string> = { super: "Ban giám đốc", hr: "Nhân sự", lead: "Tổ trưởng", staff: "Nhân viên" };
const LEAVE_LABEL: Record<string, string> = { PN: "Phép năm", PB: "Phép bệnh", VR: "Việc riêng", PC: "Phép cưới", PT: "Phép tang", TNLD: "Tai nạn LĐ" };

/* ---------------- Duyệt đơn ---------------- */
export function MobileApprovals({ go }: { go: Go }) {
  const { user } = useAuth();
  const step: 1 | 2 = user?.role === "lead" ? 1 : 2;
  const { data, refetch } = useQuery(() => fetchLeaveRequests(), []);
  const [busy, setBusy] = useState<number | null>(null);
  const pending = (data?.data ?? []).filter((r: ApiLeaveRequest) => r.status === "pending" || r.status === "approved_l1");

  async function act(id: number, action: "approve" | "reject") {
    setBusy(id);
    try { await updateLeaveRequest(id, { action, step }); } finally { setBusy(null); refetch(); }
  }

  return (
    <div className="flex h-full flex-col">
      <MHeader title="Duyệt đơn" subtitle={`${pending.length} đơn chờ xử lý`} onBack={() => go("home")} />
      <MBody>
        <div className="flex flex-col gap-3.5">
          {pending.length === 0 ? (
            <MCard className="flex flex-col items-center gap-2 p-8 text-center">
              <Check size={28} className="text-[var(--color-success)]" />
              <div className="text-[12.5px] text-[var(--color-text-muted)]">Không có đơn nào chờ duyệt.</div>
            </MCard>
          ) : pending.map((r: ApiLeaveRequest) => (
            <MCard key={r.id} className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[var(--color-navy)] text-[14px] font-bold text-white">{getInitials(r.employee_name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{r.employee_name}</div>
                  <div className="truncate text-[11.5px] text-[var(--color-text-muted)]">Mã {r.employee_code}</div>
                </div>
                <MBadge tone="accent">{LEAVE_LABEL[r.type_code] ?? r.type_code}</MBadge>
              </div>
              <div className="mt-3 flex gap-4 rounded-[11px] bg-[var(--color-page-bg)] px-3 py-2.5">
                <div><div className="text-[11px] text-[var(--color-text-lighter)]">Thời gian</div><div className={`${mono} mt-0.5 text-[13px] font-semibold`}>{formatDate(r.from_date)}{r.to_date && r.to_date !== r.from_date ? ` → ${formatDate(r.to_date)}` : ""}</div></div>
                <div><div className="text-[11px] text-[var(--color-text-lighter)]">Số ngày</div><div className={`${mono} mt-0.5 text-[13px] font-semibold`}>{r.days} ngày</div></div>
              </div>
              {r.reason && <div className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">“{r.reason}”</div>}
              <div className="mt-3 flex gap-2.5">
                <button onClick={() => act(r.id, "reject")} disabled={busy !== null} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-[#f0c9c4] bg-[#fdf4f3] text-[13px] font-bold text-[var(--color-danger)] disabled:opacity-50">
                  {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Từ chối
                </button>
                <button onClick={() => act(r.id, "approve")} disabled={busy !== null} className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-[var(--color-success)] text-[13px] font-bold text-white disabled:opacity-50">
                  {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Duyệt
                </button>
              </div>
            </MCard>
          ))}
        </div>
      </MBody>
    </div>
  );
}

/* ---------------- Phiếu lương ---------------- */
export function MobilePayslip() {
  const period = currentPeriod();
  const { data } = useQuery(() => fetchMySalary(period), [period]);
  const row = data?.data ?? null;
  const s = row ? computeSalary(row) : null;
  const income: [string, number][] = (s ? ([
    ["Lương theo công", s.workSalary], ["Phụ cấp", s.allowanceActual + s.gasAllowanceActual], ["Trách nhiệm", s.responsibilityActual],
    ["Tăng ca", s.otWeekday + s.otSunday + s.otHoliday], ["Cơm + phụ cấp khác", s.mealAllowance + s.nightAllowance + s.attendanceActual + s.bonus + s.leavePay],
  ] as [string, number][]) : []).filter(([, v]) => v > 0);
  const deduct: [string, number][] = (s ? ([
    ["BHXH, BHYT, BHTN", s.insuranceTotal], ["Kinh phí công đoàn", s.unionDues], ["Tạm ứng", s.advance], ["Trừ nợ công ty", s.companyDebt], ["Thuế TNCN", s.pit],
  ] as [string, number][]) : []).filter(([, v]) => v > 0);

  return (
    <div className="flex h-full flex-col">
      <MHeader title="Phiếu lương" right={<div className={`${mono} rounded-[10px] border border-[var(--color-border)] px-2.5 py-1.5 text-[13px] font-semibold`}>{period.slice(5)}/{period.slice(0, 4)}</div>} />
      <MBody>
        {!s ? (
          <MCard className="p-8 text-center text-[12.5px] text-[var(--color-text-muted)]">Chưa có phiếu lương kỳ này.</MCard>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-[20px] p-5 text-white shadow-[0_12px_24px_rgba(15,47,90,0.25)]" style={{ background: "linear-gradient(135deg,#0f2f5a,#1e6fd0)" }}>
              <div className="text-[12.5px] text-white/78">Thực nhận kỳ {period.slice(5)}/{period.slice(0, 4)}</div>
              <div className={`${mono} mt-1.5 text-[32px] font-bold`}>{formatMoney(s.netPay)}</div>
              <div className="mt-3.5 flex gap-6 border-t border-white/20 pt-3.5">
                <div><div className="text-[11px] text-white/70">Tổng thu nhập</div><div className={`${mono} mt-0.5 text-[14px] font-semibold`}>{s.totalIncome.toLocaleString("vi-VN")}</div></div>
                <div><div className="text-[11px] text-white/70">Khấu trừ</div><div className={`${mono} mt-0.5 text-[14px] font-semibold`}>{(s.insuranceTotal + s.unionDues + s.advance + s.companyDebt + s.pit).toLocaleString("vi-VN")}</div></div>
              </div>
            </div>
            <MCard className="p-4">
              <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-success)]"><TrendingUp size={16} /> Thu nhập</div>
              {income.map(([l, v], i) => (
                <div key={l} className={`flex justify-between py-2 ${i < income.length - 1 ? "border-b border-[var(--color-border-light)]" : ""}`}><span className="text-[13px] text-[var(--color-text-muted)]">{l}</span><span className={`${mono} text-[13px] font-semibold`}>{v.toLocaleString("vi-VN")}</span></div>
              ))}
            </MCard>
            {deduct.length > 0 && (
              <MCard className="p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-danger)]"><TrendingDown size={16} /> Khấu trừ</div>
                {deduct.map(([l, v], i) => (
                  <div key={l} className={`flex justify-between py-2 ${i < deduct.length - 1 ? "border-b border-[var(--color-border-light)]" : ""}`}><span className="text-[13px] text-[var(--color-text-muted)]">{l}</span><span className={`${mono} text-[13px] font-semibold`}>-{v.toLocaleString("vi-VN")}</span></div>
                ))}
              </MCard>
            )}
            <MButton tone="ghost" className="text-[var(--color-accent)]" onClick={() => window.print()}><Download size={18} /> Tải phiếu lương (PDF)</MButton>
          </div>
        )}
      </MBody>
    </div>
  );
}

/* ---------------- Báo cáo ngày ---------------- */
export function MobileReport({ go }: { go: Go }) {
  const { user } = useAuth();
  const empId = user?.employeeId ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const { data, refetch } = useQuery(() => fetchDailyReports(today), [today]);
  const mine = (data?.data ?? []).filter((r) => r.employee_id === empId);
  const [content, setContent] = useState("");
  const [qty, setQty] = useState(0);
  const [ng, setNg] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!content.trim()) { setErr("Nhập nội dung công việc."); return; }
    setSaving(true);
    try {
      await createDailyReport({ date: today, content: content.trim(), quantity: qty, ng_count: ng, note: note.trim() || undefined });
      setContent(""); setQty(0); setNg(0); setNote(""); refetch();
    } catch (e) { setErr((e as Error).message || "Gửi báo cáo thất bại."); } finally { setSaving(false); }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <MHeader title="Báo cáo ngày" subtitle={todayLabel()} plain onBack={() => go("home")} />
      <MBody>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-[14px] bg-[#e8f0fb] p-3"><div className={`${mono} text-[20px] font-bold text-[var(--color-accent)]`}>{mine.length}</div><div className="text-[11px] text-[var(--color-text-muted)]">Báo cáo hôm nay</div></div>
            <div className="flex-1 rounded-[14px] bg-[var(--color-success-bg)] p-3"><div className={`${mono} text-[20px] font-bold text-[var(--color-success)]`}>{mine.reduce((a, r) => a + (r.quantity || 0), 0)}</div><div className="text-[11px] text-[var(--color-text-muted)]">Sản lượng</div></div>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Công việc hôm nay</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Mô tả công việc đã làm…" className="w-full rounded-[12px] border border-[var(--color-border)] p-3 text-[13.5px] outline-none focus:border-[var(--color-accent)]" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Sản lượng</div><input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={`${mono} h-11 w-full rounded-[12px] border border-[var(--color-border)] px-3 text-[15px] font-semibold outline-none focus:border-[var(--color-accent)]`} /></div>
            <div className="flex-1"><div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Hàng lỗi (NG)</div><input type="number" min={0} value={ng} onChange={(e) => setNg(Number(e.target.value))} className={`${mono} h-11 w-full rounded-[12px] border border-[var(--color-border)] px-3 text-[15px] font-semibold outline-none focus:border-[var(--color-accent)]`} /></div>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Vướng mắc <span className="font-medium text-[var(--color-text-lighter)]">(nếu có)</span></div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="VD: thiếu phôi thép…" className="w-full rounded-[12px] border border-[var(--color-border)] p-3 text-[13.5px] outline-none focus:border-[var(--color-accent)]" />
          </div>
          {err && <div className="rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}
          <MButton onClick={submit} disabled={saving}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Gửi báo cáo</MButton>

          {mine.length > 0 && (
            <div>
              <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Báo cáo hôm nay</div>
              <div className="flex flex-col gap-2">
                {mine.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 border-b border-[var(--color-border-light)] pb-2 last:border-0">
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--color-success-bg)]"><Check size={16} className="text-[var(--color-success)]" /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{r.content}</div><div className="text-[11.5px] text-[var(--color-text-muted)]">SL {r.quantity} · NG {r.ng_count}</div></div>
                    <MBadge tone={r.status === "verified" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status === "verified" ? "Đã duyệt" : r.status === "rejected" ? "Từ chối" : "Chờ"}</MBadge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </MBody>
    </div>
  );
}

/* ---------------- KPI ---------------- */
export function MobileKpi() {
  const { user } = useAuth();
  const empId = user?.employeeId ?? null;
  const period = currentPeriod();
  const { data } = useQuery(empId ? () => fetchKpi(period) : null, [empId, period]);
  const { data: rw } = useQuery(empId ? () => fetchRewards(period) : null, [empId, period]);
  const k = data?.data?.find((x) => x.employee_id === empId);
  const reward = (rw?.data ?? []).find((x) => x.employee_id === empId);
  const parts: [string, number][] = k ? [["Năng suất", k.ns], ["Chất lượng", k.cl], ["Chuyên cần", k.bc], ["Đánh giá", k.dg]] : [];
  const pct = k ? Math.min(100, (k.score / 10) * 100) : 0;
  const circ = 2 * Math.PI * 48;

  return (
    <div className="flex h-full flex-col">
      <MHeader title="KPI cá nhân" right={<MBadge tone="accent">Kỳ {period.slice(5)}/{period.slice(0, 4)}</MBadge>} />
      <MBody>
        {!k ? (
          <MCard className="p-8 text-center text-[12.5px] text-[var(--color-text-muted)]">Chưa có điểm KPI kỳ này.</MCard>
        ) : (
          <div className="flex flex-col gap-3.5">
            <MCard className="flex items-center gap-4 p-5">
              <div className="relative h-28 w-28 flex-none">
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="var(--color-page-bg)" strokeWidth="12" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="var(--color-success)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} transform="rotate(-90 56 56)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><div className={`${mono} text-[28px] font-bold`}>{k.score.toFixed(1)}</div><div className="text-[10px] text-[var(--color-text-lighter)]">/ 10</div></div>
              </div>
              <div className="flex-1">
                {k.rank && <MBadge tone="success">Xếp hạng {k.rank}</MBadge>}
                <div className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">Kỳ đánh giá</div>
                <div className={`${mono} text-[20px] font-bold text-[var(--color-accent)]`}>{period.slice(5)}/{period.slice(0, 4)}</div>
              </div>
            </MCard>
            <MCard className="p-4">
              <div className="mb-3.5 text-[13.5px] font-bold">Điểm thành phần</div>
              {parts.map(([l, v]) => (
                <div key={l} className="mb-3 last:mb-0">
                  <div className="mb-1.5 flex justify-between"><span className="text-[12.5px] text-[var(--color-text-muted)]">{l}</span><span className={`${mono} text-[12.5px] font-bold`}>{v?.toFixed(1) ?? "—"}</span></div>
                  <div className="h-[7px] overflow-hidden rounded-[6px] bg-[var(--color-page-bg)]"><div className="h-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, ((v ?? 0) / 10) * 100)}%` }} /></div>
                </div>
              ))}
            </MCard>
            {reward && (
              <div className="flex items-center gap-2.5 rounded-[14px] border border-[#f0dcc0] p-3.5" style={{ background: "linear-gradient(135deg,#faf0e6,#fdf7ee)" }}>
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[var(--color-warning)]"><Award size={20} className="text-white" /></div>
                <div className="flex-1"><div className="text-[13px] font-bold text-[#8a5a12]">{reward.reason || "Được ghi nhận khen thưởng"}</div>{reward.amount ? <div className="text-[11.5px] text-[#a2792f]">Thưởng {formatMoney(reward.amount)}</div> : null}</div>
              </div>
            )}
          </div>
        )}
      </MBody>
    </div>
  );
}

/* ---------------- Thông báo ---------------- */
const NOTIFS = [
  { group: "Hôm nay", items: [
    { icon: CalendarClock, tone: "warning" as const, title: "Đơn phép chờ duyệt", body: "Có đơn nghỉ phép cần bạn xử lý", time: "10 phút trước", unread: true },
    { icon: AlertTriangle, tone: "danger" as const, title: "Chấm công lệch chuẩn", body: "Một số nhân viên có công lệch chuẩn kỳ này", time: "1 giờ trước", unread: true },
    { icon: Target, tone: "accent" as const, title: "KPI kỳ này đã chốt", body: "Kết quả xếp hạng đã sẵn sàng xem", time: "3 giờ trước", unread: false },
  ] },
  { group: "Trước đó", items: [
    { icon: UserPlus, tone: "success" as const, title: "Nhân viên mới", body: "Đã thêm hồ sơ nhân viên mới", time: "Hôm qua", unread: false },
    { icon: Wallet, tone: "maternity" as const, title: "Phiếu lương đã phát hành", body: "Xem chi tiết phiếu lương kỳ mới", time: "2 ngày trước", unread: false },
  ] },
];
const NOTIF_BG: Record<string, string> = { warning: "var(--color-warning-bg)", danger: "var(--color-danger-bg)", accent: "#e8f0fb", success: "var(--color-success-bg)", maternity: "var(--color-maternity-bg)" };
const NOTIF_FG: Record<string, string> = { warning: "var(--color-warning)", danger: "var(--color-danger)", accent: "var(--color-accent)", success: "var(--color-success)", maternity: "var(--color-maternity)" };

export function MobileNotifications({ go }: { go: Go }) {
  return (
    <div className="flex h-full flex-col">
      <MHeader title="Thông báo" plain onBack={() => go("home")} right={<button className="text-[12.5px] font-semibold text-[var(--color-accent)]">Đọc tất cả</button>} />
      <MBody>
        <div className="flex flex-col gap-2">
          {NOTIFS.map((sec) => (
            <div key={sec.group}>
              <div className="px-0.5 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-lighter)]">{sec.group}</div>
              <div className="flex flex-col gap-2">
                {sec.items.map((n, i) => (
                  <MCard key={i} className="flex gap-2.5 p-3.5" style={n.unread ? { borderLeft: `3px solid ${NOTIF_FG[n.tone]}` } : undefined}>
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: NOTIF_BG[n.tone] }}><n.icon size={18} style={{ color: NOTIF_FG[n.tone] }} /></div>
                    <div className="flex-1"><div className="text-[13px] font-bold text-[var(--color-text-primary)]">{n.title}</div><div className="mt-0.5 text-[12px] leading-snug text-[var(--color-text-muted)]">{n.body}</div><div className="mt-1 text-[11px] text-[var(--color-text-lighter)]">{n.time}</div></div>
                    {n.unread && <span className="mt-1 h-2 w-2 flex-none rounded-full bg-[var(--color-accent)]" />}
                  </MCard>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 text-center text-[11px] text-[var(--color-text-lighter)]"><Bell size={13} className="mb-1 inline" /> Thông báo đẩy đang được phát triển</div>
        </div>
      </MBody>
    </div>
  );
}

/* ---------------- Cá nhân ---------------- */
export function MobileProfile({ go }: { go: Go }) {
  const { user, logout } = useAuth();
  const isManager = user?.role === "super" || user?.role === "hr" || user?.role === "lead";
  const rows: { icon: typeof UserIcon; label: string; onClick?: () => void }[] = [
    { icon: Target, label: "KPI cá nhân", onClick: () => go("kpi") },
    ...(isManager ? [{ icon: Check, label: "Duyệt đơn", onClick: () => go("approvals") }] : []),
    { icon: Bell, label: "Thông báo", onClick: () => go("notifications") },
    { icon: Shield, label: "Đổi mật khẩu" },
  ];

  return (
    <div className="flex h-full flex-col">
      <MHeader title="Cá nhân" />
      <MBody>
        <div className="flex flex-col gap-3.5">
          <MCard className="flex items-center gap-3.5 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--color-navy)] text-[22px] font-bold text-white">{getInitials(user?.name ?? "")}</div>
            <div className="min-w-0">
              <div className="truncate text-[17px] font-extrabold">{user?.name ?? "Nhân viên"}</div>
              <div className="mt-0.5"><MBadge tone="accent">{ROLE_LABEL[user?.role ?? "staff"] ?? user?.role}</MBadge></div>
            </div>
          </MCard>

          <MCard className="px-4">
            <InfoRow icon={<Phone size={17} className="text-[var(--color-text-lighter)]" />} label="Số điện thoại" value={user?.phone || "—"} />
            <InfoRow icon={<Building2 size={17} className="text-[var(--color-text-lighter)]" />} label="Bộ phận" value={user?.department || "—"} />
            <InfoRow icon={<UserIcon size={17} className="text-[var(--color-text-lighter)]" />} label="Mã nhân viên" value={user?.code || (user?.employeeId ? `#${user.employeeId}` : "—")} last />
          </MCard>

          <MCard className="px-4">
            {rows.map((r, i) => (
              <button key={r.label} onClick={r.onClick} className={`flex w-full items-center gap-3 py-3.5 text-left ${i < rows.length - 1 ? "border-b border-[var(--color-border-light)]" : ""}`}>
                <r.icon size={18} className="text-[var(--color-text-secondary)]" />
                <span className="flex-1 text-[13.5px] font-medium text-[var(--color-text-secondary)]">{r.label}</span>
                <ChevronRight size={16} className="text-[var(--color-text-lighter)]" />
              </button>
            ))}
          </MCard>

          <MButton tone="ghost" className="text-[var(--color-danger)]" onClick={() => logout()}><LogOut size={18} /> Đăng xuất</MButton>
          <div className="pt-1 text-center text-[11px] text-[var(--color-text-lighter)]">© 2026 Cơ khí Tiến Huy · Nội bộ</div>
        </div>
      </MBody>
    </div>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${last ? "" : "border-b border-[var(--color-border-light)]"}`}>
      {icon}
      <span className="flex-1 text-[12.5px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
