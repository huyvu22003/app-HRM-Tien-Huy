"use client";

import { useMemo, useState } from "react";
import { Plus, X, HeartHandshake, CheckCircle2, Clock, XCircle, Loader2, Calendar } from "lucide-react";
import { fetchLeaveRequests, createLeaveRequest, type ApiLeaveRequest } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { EMPLOYEES } from "@/lib/data/employees";
import { cn, formatDate } from "@/lib/utils";

// Các loại nghỉ có thể tạo đơn (gồm cả thai sản).
const CREATE_TYPES: { code: string; label: string }[] = [
  { code: "PN", label: "Phép năm" },
  { code: "PB", label: "Phép bệnh" },
  { code: "VR", label: "Việc riêng" },
  { code: "PC", label: "Phép cưới" },
  { code: "PT", label: "Phép tang" },
  { code: "TNLD", label: "Tai nạn LĐ" },
  { code: "TS", label: "Nghỉ thai sản" },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(CREATE_TYPES.map((t) => [t.code, t.label]));

type Tab = "requests" | "maternity";
type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
];

function getStatusDisplay(status: string) {
  switch (status) {
    case "approved": return { label: "Đã duyệt", color: "approved" as const };
    case "approved_l1": return { label: "Duyệt TT", color: "approved" as const };
    case "approved_l2": return { label: "Duyệt HR", color: "approved" as const };
    case "rejected": return { label: "Từ chối", color: "rejected" as const };
    default: return { label: "Chờ duyệt", color: "pending" as const };
  }
}
const isLeadApproved = (s: string) => s === "approved_l1" || s === "approved_l2" || s === "approved";
const isHrApproved = (s: string) => s === "approved_l2" || s === "approved";
function matchesFilter(status: string, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "approved") return isLeadApproved(status);
  if (filter === "rejected") return status === "rejected";
  return true;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function periodOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function LeaveScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("requests");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("PN");
  const [days, setDays] = useState(1);
  const [fromDate, setFromDate] = useState<string>(todayISO());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(() => fetchLeaveRequests(), []);
  const requests: ApiLeaveRequest[] = data?.data ?? [];
  const filtered = requests.filter((r) => matchesFilter(r.status, statusFilter));

  const maternityEmployees = useMemo(() => EMPLOYEES.filter((e) => e.status === "Nghỉ thai sản"), []);
  const balance = { entitled: 12, carried: 2, used: 5, get remaining() { return this.entitled + this.carried - this.used; } };

  const isMaternity = leaveType === "TS";

  function openCreate(preset?: string) {
    setLeaveType(preset ?? "PN");
    setDays(preset === "TS" ? 180 : 1);
    setFromDate(todayISO());
    setReason("");
    setErr(null);
    setModalOpen(true);
  }

  async function submit() {
    setErr(null);
    if (!user?.employeeId) { setErr("Tài khoản chưa gắn nhân viên nên không tạo đơn được."); return; }
    if (!fromDate) { setErr("Chọn ngày bắt đầu nghỉ."); return; }
    if (!days || days < 1) { setErr("Số ngày nghỉ phải ≥ 1."); return; }
    setSubmitting(true);
    try {
      await createLeaveRequest({
        employeeId: user.employeeId,
        typeCode: leaveType,
        fromDate,
        toDate: addDays(fromDate, days - 1),
        days,
        reason: reason.trim() || undefined,
      });
      setModalOpen(false);
      refetch();
    } catch (e) {
      setErr((e as Error).message || "Gửi đơn thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {([["requests", "Đơn nghỉ phép"], ["maternity", "Nghỉ thai sản"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-[13px] font-medium",
              tab === key
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
            )}
          >
            {label}
            {key === "maternity" && maternityEmployees.length > 0 && (
              <span className="ml-1.5 rounded-[10px] bg-[var(--color-maternity-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-maternity)]">{maternityEmployees.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <>
          <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
            <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Quy tắc phép năm</div>
            <ul className="list-inside list-disc text-[12.5px] text-[var(--color-text-muted)]">
              <li>Cơ bản 12 ngày phép/năm cho nhân viên chính thức.</li>
              <li>Cộng thêm 1 ngày phép cho mỗi 5 năm thâm niên.</li>
              <li>Tối đa 2 ngày phép năm (PN) được dùng mỗi tháng.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Đơn nghỉ phép</div>
            <button onClick={() => openCreate()} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]">
              <Plus size={14} /> Tạo đơn nghỉ phép
            </button>
          </div>

          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className={cn("rounded-[20px] border px-3 py-1 text-[12px] font-medium", statusFilter === f.key ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]")}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[var(--color-text-muted)]"><Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu...</div>
            ) : (
              <table className="w-full min-w-[700px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                    <th className="px-4 py-3 font-medium">Nhân viên</th>
                    <th className="px-4 py-3 font-medium">Loại</th>
                    <th className="px-4 py-3 font-medium">Số ngày</th>
                    <th className="px-4 py-3 font-medium">Từ ngày</th>
                    <th className="px-4 py-3 font-medium">Duyệt tổ trưởng</th>
                    <th className="px-4 py-3 font-medium">Duyệt HR</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Không có đơn nghỉ phép nào.</td></tr>
                  ) : (
                    filtered.map((r) => {
                      const display = getStatusDisplay(r.status);
                      return (
                        <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                          <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{r.employee_name}</td>
                          <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{TYPE_LABEL[r.type_code] ?? r.type_code}</td>
                          <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{r.days}</td>
                          <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{formatDate(r.from_date)}</td>
                          <td className="px-4 py-2.5">{isLeadApproved(r.status) ? <CheckCircle2 size={15} className="text-[var(--color-success)]" /> : <Clock size={15} className="text-[var(--color-text-lighter)]" />}</td>
                          <td className="px-4 py-2.5">{isHrApproved(r.status) ? <CheckCircle2 size={15} className="text-[var(--color-success)]" /> : <Clock size={15} className="text-[var(--color-text-lighter)]" />}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("flex w-fit items-center gap-1 rounded-[20px] px-2 py-0.5 text-[11px] font-medium", display.color === "approved" && "bg-[var(--color-success-bg)] text-[var(--color-success)]", display.color === "pending" && "bg-[var(--color-warning-bg)] text-[var(--color-warning)]", display.color === "rejected" && "bg-[var(--color-danger-bg)] text-[var(--color-danger)]")}>
                              {display.color === "approved" && <CheckCircle2 size={11} />}
                              {display.color === "pending" && <Clock size={11} />}
                              {display.color === "rejected" && <XCircle size={11} />}
                              {display.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
            <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Số dư phép năm</div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[["Được cấp", balance.entitled], ["Chuyển kỳ", balance.carried], ["Đã dùng", balance.used], ["Còn lại", balance.remaining]].map(([label, val]) => (
                <div key={label as string}>
                  <div className="font-[family-name:var(--font-mono)] text-[18px] font-semibold text-[var(--color-text-primary)]">{val}</div>
                  <div className="text-[11px] text-[var(--color-text-light)]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "maternity" && (
        <div className="rounded-[14px] border border-[var(--color-maternity)] bg-[var(--color-maternity-bg)] p-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-maternity)]">
              <HeartHandshake size={16} /> Chế độ thai sản
            </div>
            <button onClick={() => openCreate("TS")} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-maternity)] px-3 py-1.5 text-[12px] font-medium text-white">
              <Plus size={14} /> Đăng ký nghỉ thai sản
            </button>
          </div>
          {maternityEmployees.length === 0 ? (
            <p className="text-[12.5px] text-[var(--color-text-muted)]">Không có trường hợp nghỉ thai sản. Bấm “Đăng ký nghỉ thai sản” để tạo.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <p className="text-[12.5px] text-[var(--color-text-muted)]">{maternityEmployees.length} trường hợp đang trong thời gian nghỉ thai sản theo quy định BHXH (nghỉ 6 tháng, không trừ phép năm).</p>
              {maternityEmployees.map((e) => {
                const startDate = e.leaveDate || "";
                const endMonth = startDate ? (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + 6); return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; })() : "";
                return (
                  <div key={e.code} className="flex items-center justify-between rounded-[10px] bg-white/70 px-3 py-2.5">
                    <div>
                      <div className="text-[12.5px] font-medium text-[var(--color-text-primary)]">{e.name}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{e.department} · Mã {e.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--color-maternity)]"><Calendar size={11} /> Từ {formatDate(startDate)}</div>
                      {endMonth && <div className="text-[10.5px] text-[var(--color-text-lighter)]">Dự kiến quay lại: {endMonth}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{isMaternity ? "Đăng ký nghỉ thai sản" : "Tạo đơn nghỉ phép"}</div>
              <button onClick={() => setModalOpen(false)}><X size={18} className="text-[var(--color-text-lighter)]" /></button>
            </div>

            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">Loại nghỉ</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {CREATE_TYPES.map((t) => (
                <button
                  key={t.code}
                  onClick={() => { setLeaveType(t.code); if (t.code === "TS" && days < 30) setDays(180); }}
                  className={cn("rounded-[20px] border px-3 py-1.5 text-[12.5px] font-medium", leaveType === t.code ? (t.code === "TS" ? "border-[var(--color-maternity)] bg-[var(--color-maternity)] text-white" : "border-[var(--color-accent)] bg-[var(--color-accent)] text-white") : "border-[var(--color-border)] text-[var(--color-text-muted)]")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">Từ ngày</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">Số ngày nghỉ</label>
                <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]" />
              </div>
            </div>

            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">Lý do (không bắt buộc)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: về quê, khám bệnh…" className="mb-4 h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]" />

            <div className={cn("mb-4 rounded-[10px] p-3 text-[12.5px]", isMaternity ? "bg-[var(--color-maternity-bg)] text-[var(--color-maternity)]" : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]")}>
              {isMaternity ? (
                <>Nghỉ thai sản <b>{days}</b> ngày theo chế độ BHXH — <b>không trừ phép năm</b>. Từ {formatDate(fromDate)}.</>
              ) : (
                <>Ghi nhận <b className="text-[var(--color-text-primary)]">{days}</b> ngày nghỉ loại <b className="text-[var(--color-text-primary)]">{TYPE_LABEL[leaveType]}</b> vào kỳ {periodOf(fromDate)}.</>
              )}
            </div>

            {err && <div className="mb-3 rounded-[8px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}

            <div className="flex gap-2">
              <button onClick={submit} disabled={submitting} className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] py-2 text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60">
                {submitting && <Loader2 size={14} className="animate-spin" />} Gửi đơn
              </button>
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-[8px] border border-[var(--color-border)] py-2 text-[13px] text-[var(--color-text-secondary)]">Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
