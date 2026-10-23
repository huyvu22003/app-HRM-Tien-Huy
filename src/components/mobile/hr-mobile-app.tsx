"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, Check, CheckCircle2, ClipboardCheck, Clock3, LayoutDashboard,
  Loader2, Plus, RotateCcw, Search, ShieldCheck, UserCog, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@/lib/hooks";
import {
  createAccount, fetchAccounts, fetchAllEmployees, fetchCheckins, fetchLeaveRequests,
  resetAccountPassword, updateLeaveRequest, type ApiAccount, type ApiLeaveRequest,
} from "@/lib/api";
import { MBody, MBadge, MCard, MHeader, mono } from "./primitives";
import { MobilePayslip } from "./more";

type HrTab = "overview" | "employees" | "attendance" | "approvals" | "accounts" | "salary";
type ManagementMobileMode = "hr" | "director";
const today = () => new Date().toISOString().slice(0, 10);

function Overview({ mode }: { mode: ManagementMobileMode }) {
  const { data: employees } = useQuery(() => fetchAllEmployees(), []);
  const { data: checkins } = useQuery(() => fetchCheckins(today()), []);
  const { data: leaves } = useQuery(() => fetchLeaveRequests(), []);
  const { data: accounts } = useQuery(() => mode === "hr" ? fetchAccounts() : Promise.resolve({ accounts: [], employeesWithoutAccount: [] }), [mode]);
  const active = (employees?.data ?? []).filter((e) => e.status === "Đang làm việc").length;
  const present = (checkins?.data ?? []).filter((c) => c.time_in).length;
  const pending = (leaves?.data ?? []).filter((l) => l.status === "approved_l1").length;
  const noAccount = accounts?.employeesWithoutAccount.length ?? 0;
  const stats = [
    ["Đang làm việc", active, Users, "var(--color-accent)"],
    ["Có mặt hôm nay", present, Clock3, "var(--color-success)"],
    ["Chờ HR duyệt", pending, ClipboardCheck, "var(--color-warning)"],
    ["Chưa có tài khoản", noAccount, UserCog, "var(--color-danger)"],
  ] as const;
  return <div className="flex h-full flex-col"><MHeader title={mode === "director" ? "Giám đốc Mobile" : "HR Mobile"} subtitle="Tổng quan vận hành hôm nay" /><MBody>
    <div className="grid grid-cols-2 gap-3">{stats.map(([label, value, Icon, color]) => <MCard key={label} className="p-4"><Icon size={20} style={{ color }} /><div className={`${mono} mt-2 text-[25px] font-bold`}>{value}</div><div className="text-[11.5px] text-[var(--color-text-muted)]">{label}</div></MCard>)}</div>
    <MCard className="mt-4 p-4"><div className="text-[13.5px] font-bold">Cần xử lý</div><div className="mt-3 flex flex-col gap-2">
      {pending > 0 && <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-warning-bg)] p-3 text-[12px]"><ClipboardCheck size={17} className="text-[var(--color-warning)]" /> {pending} đơn đã qua tổ trưởng, chờ HR duyệt.</div>}
      {noAccount > 0 && <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-danger-bg)] p-3 text-[12px]"><AlertTriangle size={17} className="text-[var(--color-danger)]" /> {noAccount} hồ sơ chưa có tài khoản.</div>}
      {pending === 0 && noAccount === 0 && <div className="flex items-center gap-2 py-2 text-[12px] text-[var(--color-text-muted)]"><CheckCircle2 size={17} className="text-[var(--color-success)]" /> Không có cảnh báo quan trọng.</div>}
    </div></MCard>
  </MBody></div>;
}

function Employees() {
  const { data } = useQuery(() => fetchAllEmployees(), []);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => (data?.data ?? []).filter((e) => `${e.name} ${e.code} ${e.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  return <div className="flex h-full flex-col"><MHeader title="Nhân sự" subtitle={`${data?.total ?? 0} hồ sơ`} /><MBody>
    <div className="mb-3 flex h-11 items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-white px-3"><Search size={17} className="text-[var(--color-text-lighter)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, mã hoặc SĐT" className="h-full flex-1 bg-transparent text-[13px] outline-none" /></div>
    <MCard className="divide-y divide-[var(--color-border-light)]">{rows.slice(0, 100).map((e) => <div key={e.id} className="flex items-center gap-3 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#e8f0fb] text-[12px] font-bold text-[var(--color-accent)]">{e.code.slice(-3)}</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{e.name}</div><div className="truncate text-[11.5px] text-[var(--color-text-muted)]">{e.code} · {e.position || "Chưa có chức vụ"}</div></div><MBadge tone={e.status === "Đang làm việc" ? "success" : "muted"}>{e.status}</MBadge></div>)}</MCard>
    {rows.length > 100 && <div className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">Đang hiển thị 100 kết quả đầu. Hãy tìm kiếm để thu hẹp.</div>}
  </MBody></div>;
}

function Attendance() {
  const date = today();
  const { data: employees } = useQuery(() => fetchAllEmployees(), []);
  const { data: checkins } = useQuery(() => fetchCheckins(date), [date]);
  const active = (employees?.data ?? []).filter((e) => e.status === "Đang làm việc");
  const byEmployee = new Map((checkins?.data ?? []).map((c) => [c.employee_id, c]));
  const missing = active.filter((e) => !byEmployee.has(e.id));
  return <div className="flex h-full flex-col"><MHeader title="Chấm công hôm nay" subtitle={date.split("-").reverse().join("/")} /><MBody>
    <div className="mb-3 grid grid-cols-2 gap-3"><MCard className="p-4"><div className={`${mono} text-[24px] font-bold text-[var(--color-success)]`}>{byEmployee.size}</div><div className="text-[11.5px] text-[var(--color-text-muted)]">Đã chấm vào</div></MCard><MCard className="p-4"><div className={`${mono} text-[24px] font-bold text-[var(--color-danger)]`}>{missing.length}</div><div className="text-[11.5px] text-[var(--color-text-muted)]">Chưa ghi nhận</div></MCard></div>
    <div className="mb-2 text-[13px] font-bold">Chưa chấm công</div><MCard className="divide-y divide-[var(--color-border-light)]">{missing.slice(0, 100).map((e) => <div key={e.id} className="flex items-center justify-between p-3"><div><div className="text-[12.5px] font-semibold">{e.name}</div><div className="text-[11px] text-[var(--color-text-muted)]">{e.code} · {e.position || "Nhân viên"}</div></div><MBadge tone="danger">Chưa vào</MBadge></div>)}{missing.length === 0 && <div className="p-5 text-center text-[12px] text-[var(--color-text-muted)]">Tất cả nhân viên đã được ghi nhận.</div>}</MCard>
  </MBody></div>;
}

function Approvals() {
  const { data, refetch } = useQuery(() => fetchLeaveRequests(), []);
  const [busy, setBusy] = useState<number | null>(null);
  const rows = (data?.data ?? []).filter((l) => l.status === "pending" || l.status === "approved_l1");
  async function act(row: ApiLeaveRequest, action: "approve" | "reject") { setBusy(row.id); try { await updateLeaveRequest(row.id, { action, step: 2 }); refetch(); } finally { setBusy(null); } }
  return <div className="flex h-full flex-col"><MHeader title="Duyệt nghỉ phép" subtitle={`${rows.filter((r) => r.status === "approved_l1").length} đơn chờ HR`} /><MBody><div className="flex flex-col gap-3">{rows.map((r) => <MCard key={r.id} className="p-4"><div className="flex items-start justify-between gap-2"><div><div className="text-[13.5px] font-bold">{r.employee_name}</div><div className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">{r.type_code} · {r.days} ngày · {r.from_date} → {r.to_date}</div></div><MBadge tone={r.status === "approved_l1" ? "warning" : "muted"}>{r.status === "approved_l1" ? "Chờ HR" : "Chờ tổ trưởng"}</MBadge></div>{r.reason && <div className="mt-2 rounded-[8px] bg-[var(--color-page-bg)] p-2 text-[11.5px]">{r.reason}</div>}<div className="mt-3 flex gap-2"><button disabled={busy === r.id} onClick={() => act(r, "reject")} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-[9px] bg-[var(--color-danger-bg)] text-[12px] font-semibold text-[var(--color-danger)]"><X size={15} /> Từ chối</button><button disabled={busy === r.id || r.status !== "approved_l1"} onClick={() => act(r, "approve")} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-[9px] bg-[var(--color-success)] text-[12px] font-semibold text-white disabled:opacity-40">{busy === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Duyệt cấp 2</button></div></MCard>)}{rows.length === 0 && <MCard className="p-8 text-center text-[12.5px] text-[var(--color-text-muted)]">Không có đơn chờ xử lý.</MCard>}</div></MBody></div>;
}

function Accounts() {
  const { data, refetch } = useQuery(() => fetchAccounts(), []);
  const [busy, setBusy] = useState<number | null>(null);
  const [credential, setCredential] = useState<{ phone: string; password: string; expiresAt: string } | null>(null);
  async function reset(account: ApiAccount) { if (!window.confirm(`Đặt lại mật khẩu cho ${account.phone}?`)) return; setBusy(account.id); try { const result = await resetAccountPassword(account.id); setCredential({ phone: account.phone, password: result.temporaryPassword, expiresAt: result.expiresAt }); refetch(); } finally { setBusy(null); } }
  async function issue(employee: NonNullable<typeof data>["employeesWithoutAccount"][number]) { if (!employee.phone || !window.confirm(`Cấp tài khoản nhân viên cho ${employee.name}?`)) return; setBusy(employee.id); try { const result = await createAccount({ employeeId: employee.id, phone: employee.phone, role: "staff" }); setCredential({ phone: employee.phone, password: result.temporaryPassword, expiresAt: result.expiresAt }); refetch(); } finally { setBusy(null); } }
  const resettable = (data?.accounts ?? []).filter((a) => a.role === "lead" || a.role === "staff");
  return <div className="flex h-full flex-col"><MHeader title="Tài khoản nhân viên" subtitle={`${data?.employeesWithoutAccount.length ?? 0} hồ sơ chưa được cấp`} /><MBody>
    {credential && <MCard className="mb-3 border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4"><div className="flex items-center gap-2 text-[13px] font-bold"><ShieldCheck size={17} /> Mật khẩu tạm — chỉ hiện một lần</div><div className="mt-2 text-[12px]">Tài khoản: <b>{credential.phone}</b></div><div className={`${mono} mt-1 text-[18px] font-bold`}>{credential.password}</div><div className="mt-1 text-[11px] text-[var(--color-text-muted)]">Hết hạn: {new Date(credential.expiresAt).toLocaleString("vi-VN")}</div><button onClick={() => setCredential(null)} className="mt-2 rounded-[8px] bg-white px-3 py-1.5 text-[11px]">Đã ghi nhận</button></MCard>}
    <div className="mb-2 text-[13px] font-bold">Chưa có tài khoản</div><MCard className="divide-y divide-[var(--color-border-light)]">{(data?.employeesWithoutAccount ?? []).slice(0, 30).map((e) => <div key={e.id} className="flex items-center gap-2 p-3"><div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold">{e.name}</div><div className="text-[11px] text-[var(--color-text-muted)]">{e.code} · {e.phone || "Thiếu SĐT"}</div></div><button disabled={busy === e.id || !e.phone} onClick={() => issue(e)} className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--color-accent)] px-2.5 text-[11.5px] font-semibold text-[var(--color-accent)] disabled:opacity-35"><Plus size={14} /> Cấp TK</button></div>)}</MCard>
    <div className="mb-2 mt-4 text-[13px] font-bold">Có thể đặt lại mật khẩu</div><MCard className="divide-y divide-[var(--color-border-light)]">{resettable.map((a) => <div key={a.id} className="flex items-center gap-2 p-3"><div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold">{a.employee_name || a.phone}</div><div className="text-[11px] text-[var(--color-text-muted)]">{a.phone} · {a.role === "lead" ? "Tổ trưởng" : "Nhân viên"}</div></div><button disabled={busy === a.id} onClick={() => reset(a)} className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-2.5 text-[11.5px]"><RotateCcw size={14} /> Reset</button></div>)}</MCard>
  </MBody></div>;
}

const TABS: { key: HrTab; label: string; icon: typeof Users }[] = [
  { key: "overview", label: "Tổng quan", icon: LayoutDashboard }, { key: "employees", label: "Nhân sự", icon: Users },
  { key: "attendance", label: "Chấm công", icon: Clock3 }, { key: "approvals", label: "Duyệt", icon: ClipboardCheck },
  { key: "accounts", label: "Tài khoản", icon: UserCog }, { key: "salary", label: "Lương tôi", icon: Wallet },
];

export function HrMobileApp({ mode = "hr" }: { mode?: ManagementMobileMode }) {
  const [tab, setTab] = useState<HrTab>("overview");
  const tabs = mode === "director" ? TABS.filter((item) => item.key !== "accounts" && item.key !== "salary") : TABS;
  const content = tab === "overview" ? <Overview mode={mode} /> : tab === "employees" ? <Employees /> : tab === "attendance" ? <Attendance /> : tab === "approvals" ? <Approvals /> : tab === "salary" ? <MobilePayslip /> : <Accounts />;
  return <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--color-page-bg)]"><div key={tab} className="flex min-h-0 flex-1 flex-col">{content}</div><nav className="flex flex-none border-t border-[var(--color-border)] bg-white/95 px-1 pt-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 8px)" }}>{tabs.map((item) => { const active = item.key === tab; return <button key={item.key} onClick={() => setTab(item.key)} className="flex flex-1 flex-col items-center gap-1 py-1"><item.icon size={21} className={cn(active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]")} /><span className={cn("text-[9.5px] font-semibold", active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]")}>{item.label}</span></button>; })}</nav></div>;
}
