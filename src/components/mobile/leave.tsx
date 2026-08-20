"use client";

import { useState } from "react";
import { Plus, Palmtree, Thermometer, UserRound, Heart, Flower2, Stethoscope, CheckCircle2, Clock, XCircle, Send, Loader2, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import { fetchLeaveBalance, fetchLeaveRequests, createLeaveRequest, type ApiLeaveRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MCard, MHeader, MButton, MBadge, MBody, mono } from "./primitives";
import { DateField } from "@/components/ui/date-field";
import { type Go } from "./nav";

const TYPES: { code: string; label: string; icon: typeof Palmtree; tone: "accent" | "danger" | "muted" | "maternity" | "warning" }[] = [
  { code: "PN", label: "Phép năm", icon: Palmtree, tone: "accent" },
  { code: "PB", label: "Phép bệnh", icon: Thermometer, tone: "danger" },
  { code: "VR", label: "Việc riêng", icon: UserRound, tone: "muted" },
  { code: "PC", label: "Phép cưới", icon: Heart, tone: "maternity" },
  { code: "PT", label: "Phép tang", icon: Flower2, tone: "muted" },
  { code: "TNLD", label: "Tai nạn LĐ", icon: Stethoscope, tone: "warning" },
];
const TYPE = Object.fromEntries(TYPES.map((t) => [t.code, t]));

const isLead = (s: string) => s === "approved_l1" || s === "approved_l2" || s === "approved";
const isHr = (s: string) => s === "approved_l2" || s === "approved";
function statusInfo(s: string): { label: string; tone: "success" | "warning" | "danger" } {
  if (s === "rejected") return { label: "Từ chối", tone: "danger" };
  if (isLead(s)) return { label: "Đã duyệt", tone: "success" };
  return { label: "Chờ", tone: "warning" };
}

type Filter = "all" | "pending" | "approved" | "rejected";
const FILTERS: { k: Filter; label: string }[] = [
  { k: "all", label: "Tất cả" }, { k: "pending", label: "Chờ duyệt" }, { k: "approved", label: "Đã duyệt" }, { k: "rejected", label: "Từ chối" },
];

export function MobileLeave({ go }: { go: Go }) {
  const { user } = useAuth();
  const empId = user?.employeeId ?? null;
  const [filter, setFilter] = useState<Filter>("all");

  const { data: bal } = useQuery(empId ? () => fetchLeaveBalance(empId) : null, [empId]);
  const { data: reqData } = useQuery(empId ? () => fetchLeaveRequests({ employeeId: empId }) : null, [empId]);
  const requests: ApiLeaveRequest[] = reqData?.data ?? [];
  const b = bal?.data;

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending";
    if (filter === "approved") return isLead(r.status);
    return r.status === "rejected";
  });

  return (
    <div className="flex h-full flex-col">
      <MHeader
        title="Nghỉ phép"
        subtitle="Đơn & số dư phép của bạn"
        right={<button onClick={() => go("createLeave")} className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-accent)] text-white shadow-[0_6px_14px_rgba(30,111,208,0.3)]"><Plus size={22} /></button>}
      />
      <MBody>
        <div className="flex flex-col gap-3.5">
          <MCard className="p-4">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="text-[13.5px] font-bold">Số dư phép năm {b?.year ?? ""}</div>
              {b && b.pending > 0 && <MBadge tone="warning">Chờ duyệt {b.pending}</MBadge>}
            </div>
            {!empId ? (
              <div className="text-[12.5px] text-[var(--color-text-muted)]">Tài khoản chưa gắn nhân viên.</div>
            ) : !b ? (
              <div className="text-[12.5px] text-[var(--color-text-muted)]">Đang tải…</div>
            ) : (
              <>
                <div className="flex text-center">
                  {[["Được cấp", b.entitled, "var(--color-accent)"], ["Đã dùng", b.used, "var(--color-warning)"], ["Chờ duyệt", b.pending, "var(--color-danger)"], ["Còn lại", b.remaining, "var(--color-success)"]].map(([l, v, c]) => (
                    <div key={l as string} className="flex-1">
                      <div className={`${mono} text-[20px] font-bold`} style={{ color: c as string }}>{v as number}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{l as string}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 flex h-2 overflow-hidden rounded-[8px] bg-[var(--color-page-bg)]">
                  <div className="bg-[var(--color-warning)]" style={{ width: `${Math.min(100, (b.used / Math.max(1, b.entitled)) * 100)}%` }} />
                  <div className="bg-[#f0c78a]" style={{ width: `${Math.min(100, (b.pending / Math.max(1, b.entitled)) * 100)}%` }} />
                </div>
              </>
            )}
          </MCard>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {FILTERS.map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={`whitespace-nowrap rounded-[20px] border px-3 py-1.5 text-[12.5px] font-semibold ${filter === f.k ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>{f.label}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <MCard className="flex flex-col items-center gap-2 p-8 text-center">
              <CalendarDays size={28} className="text-[var(--color-text-lighter)]" />
              <div className="text-[12.5px] text-[var(--color-text-muted)]">Chưa có đơn nghỉ nào.</div>
            </MCard>
          ) : (
            filtered.map((r) => {
              const t = TYPE[r.type_code] ?? { label: r.type_code, icon: CalendarDays, tone: "muted" as const };
              const st = statusInfo(r.status);
              const Icon = t.icon;
              return (
                <MCard key={r.id} className="p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--color-page-bg)]"><Icon size={18} className="text-[var(--color-text-secondary)]" /></div>
                      <div>
                        <div className="text-[13.5px] font-bold">{t.label}</div>
                        <div className={`${mono} text-[11.5px] text-[var(--color-text-muted)]`}>{formatDate(r.from_date)}{r.to_date && r.to_date !== r.from_date ? ` → ${formatDate(r.to_date)}` : ""} · {r.days} ngày</div>
                      </div>
                    </div>
                    <MBadge tone={st.tone}>
                      {st.tone === "success" ? <CheckCircle2 size={13} /> : st.tone === "danger" ? <XCircle size={13} /> : <Clock size={13} />}
                      {st.label}
                    </MBadge>
                  </div>
                  {r.status !== "rejected" && (
                    <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5 text-[11.5px] text-[var(--color-text-muted)]">
                      <span className={`flex items-center gap-1 font-semibold ${isLead(r.status) ? "text-[var(--color-success)]" : ""}`}>{isLead(r.status) ? <CheckCircle2 size={13} /> : <Clock size={13} className="text-[var(--color-text-lighter)]" />} Tổ trưởng</span>
                      <span className="h-px flex-1 bg-[var(--color-border)]" />
                      <span className={`flex items-center gap-1 font-semibold ${isHr(r.status) ? "text-[var(--color-success)]" : ""}`}>{isHr(r.status) ? <CheckCircle2 size={13} /> : <Clock size={13} className="text-[var(--color-text-lighter)]" />} HR</span>
                    </div>
                  )}
                </MCard>
              );
            })
          )}
        </div>
      </MBody>
    </div>
  );
}

const todayISO = () => new Date().toISOString().slice(0, 10);
function addDays(iso: string, n: number) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function periodOf(iso: string) { const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; }

export function MobileCreateLeave({ go }: { go: Go }) {
  const { user } = useAuth();
  const [type, setType] = useState("PN");
  const [from, setFrom] = useState(todayISO());
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!user?.employeeId) { setErr("Tài khoản chưa gắn nhân viên nên không tạo đơn được."); return; }
    if (!from) { setErr("Chọn ngày bắt đầu nghỉ."); return; }
    if (!days || days < 1) { setErr("Số ngày nghỉ phải ≥ 1."); return; }
    setSaving(true);
    try {
      await createLeaveRequest({ employeeId: user.employeeId, typeCode: type, fromDate: from, toDate: addDays(from, days - 1), days, reason: reason.trim() || undefined });
      go("leave");
    } catch (e) {
      setErr((e as Error).message || "Gửi đơn thất bại.");
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <MHeader title="Tạo đơn nghỉ phép" plain onBack={() => go("leave")} />
      <MBody>
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Loại nghỉ</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.code} onClick={() => setType(t.code)} className={`rounded-[20px] border px-3 py-1.5 text-[12.5px] font-semibold ${type === t.code ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Từ ngày</div>
              <DateField value={from} onChange={setFrom} className="h-11 w-full rounded-[12px] border border-[var(--color-border)] px-3 text-[13.5px] outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="w-[110px]">
              <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Số ngày</div>
              <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${mono} h-11 w-full rounded-[12px] border border-[var(--color-border)] px-3 text-[15px] font-semibold outline-none focus:border-[var(--color-accent)]`} />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-bold text-[var(--color-text-secondary)]">Lý do <span className="font-medium text-[var(--color-text-lighter)]">(không bắt buộc)</span></div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="VD: về quê, khám bệnh…" className="w-full rounded-[12px] border border-[var(--color-border)] p-3 text-[13.5px] outline-none focus:border-[var(--color-accent)]" />
          </div>
          <div className="rounded-[12px] bg-[var(--color-page-bg)] p-3 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
            Ghi nhận <b className="text-[var(--color-text-primary)]">{days} ngày</b> nghỉ loại <b className="text-[var(--color-text-primary)]">{TYPE[type]?.label}</b> vào kỳ <b className={`${mono} text-[var(--color-text-primary)]`}>{periodOf(from)}</b>.
          </div>
          {err && <div className="rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}
          <div className="flex gap-2.5">
            <MButton tone="ghost" className="flex-1" onClick={() => go("leave")}>Huỷ</MButton>
            <MButton className="flex-[2]" onClick={submit} disabled={saving}>{saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Gửi đơn</MButton>
          </div>
        </div>
      </MBody>
    </div>
  );
}
