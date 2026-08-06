"use client";

import { useMemo, useState } from "react";
import { Plus, X, HeartHandshake, Loader2, Calendar, FileCheck2, FileWarning, ChevronDown, Stethoscope } from "lucide-react";
import {
  fetchMaternity, createMaternity, updateMaternity, saveMaternityCheckups,
  fetchAllEmployees, type ApiMaternity, type ApiPrenatalCheckup,
} from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  soon: "Đang mang thai", active: "Đang nghỉ sanh", returning: "Sắp quay lại", done: "Đã quay lại",
};
const STATUS_OPTS = ["soon", "active", "returning", "done"];
const todayISO = () => new Date().toISOString().slice(0, 10);

type CheckRow = { seq: number; date: string; special: boolean; docSubmitted: boolean; note: string };

function toRows(checkups: ApiPrenatalCheckup[]): CheckRow[] {
  return Array.from({ length: 5 }, (_, i) => {
    const c = checkups.find((x) => x.seq === i + 1);
    return {
      seq: i + 1,
      date: c?.checkup_date ? c.checkup_date.slice(0, 10) : "",
      special: !!c?.special,
      docSubmitted: !!c?.doc_submitted,
      note: c?.note ?? "",
    };
  });
}

export function MaternityPanel() {
  const { data, isLoading, refetch } = useQuery(() => fetchMaternity(), []);
  const records = data?.data ?? [];
  const [registerOpen, setRegisterOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-maternity)] bg-[var(--color-maternity-bg)] p-[16px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-maternity)]">
            <HeartHandshake size={16} /> Theo dõi thai sản
          </div>
          <button onClick={() => setRegisterOpen(true)} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-maternity)] px-3 py-1.5 text-[12px] font-medium text-white">
            <Plus size={14} /> Đăng ký thai sản
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
          <b>Khám thai định kỳ:</b> tối đa <b>5 lần</b> trong thai kỳ — mỗi lần nghỉ <b>1 ngày làm việc</b> (2 ngày nếu thai bệnh lý / ở xa cơ sở y tế), tính theo ngày làm việc thực tế. Mỗi lần cần nộp <b>giấy chứng nhận nghỉ hưởng BHXH</b>. Nghỉ sanh 6 tháng theo chế độ BHXH.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[var(--color-text-muted)]"><Loader2 size={16} className="animate-spin" /> Đang tải...</div>
      ) : records.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-8 text-center text-[13px] text-[var(--color-text-muted)]">
          Chưa có hồ sơ thai sản nào. Bấm “Đăng ký thai sản” để tạo.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r) => (
            <MaternityCard key={r.id} record={r} expanded={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)} onSaved={refetch} />
          ))}
        </div>
      )}

      {registerOpen && <RegisterModal onClose={() => setRegisterOpen(false)} onSaved={() => { setRegisterOpen(false); refetch(); }} />}
    </div>
  );
}

function MaternityCard({ record, expanded, onToggle, onSaved }: { record: ApiMaternity; expanded: boolean; onToggle: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<CheckRow[]>(() => toRows(record.checkups));
  const [status, setStatus] = useState(record.status);
  const [dueDate, setDueDate] = useState(record.due_date?.slice(0, 10) ?? "");
  const [startDate, setStartDate] = useState(record.start_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  const done = rows.filter((r) => r.date).length;
  const totalDays = rows.reduce((s, r) => s + (r.date ? (r.special ? 2 : 1) : 0), 0);
  const docsMissing = rows.filter((r) => r.date && !r.docSubmitted).length;

  const setRow = (seq: number, patch: Partial<CheckRow>) =>
    setRows((rs) => rs.map((r) => (r.seq === seq ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    try {
      await updateMaternity(record.id, { status, dueDate: dueDate || null, startDate: startDate || null });
      await saveMaternityCheckups(record.id, rows.map((r) => ({ seq: r.seq, date: r.date || null, special: r.special, docSubmitted: r.docSubmitted, note: r.note || null })));
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-white">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--color-page-bg)]">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">{record.employee_name} <span className="font-normal text-[var(--color-text-muted)]">· {record.department_name ?? ""} · Mã {record.employee_code}</span></div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Calendar size={11} /> Dự sinh: {dueDate ? formatDate(dueDate) : "—"}</span>
            <span className="flex items-center gap-1"><Stethoscope size={11} /> Khám: <b className="text-[var(--color-text-secondary)]">{done}/5</b> lần · {totalDays} ngày</span>
            {docsMissing > 0 && <span className="flex items-center gap-1 text-[var(--color-warning)]"><FileWarning size={11} /> Thiếu {docsMissing} giấy BHXH</span>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="rounded-[20px] bg-[var(--color-maternity-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-maternity)]">{STATUS_LABEL[status] ?? status}</span>
          <ChevronDown size={16} className={cn("text-[var(--color-text-lighter)] transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border-light)] px-4 py-4">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Fld label="Ngày dự sinh"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="fld" /></Fld>
            <Fld label="Ngày bắt đầu nghỉ sanh"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="fld" /></Fld>
            <Fld label="Trạng thái">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="fld">
                {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Fld>
          </div>

          <div className="mb-2 text-[12px] font-semibold text-[var(--color-text-secondary)]">Các lần khám thai (tối đa 5)</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                  <th className="py-1.5 pr-2 font-medium">Lần</th>
                  <th className="py-1.5 pr-2 font-medium">Ngày khám</th>
                  <th className="py-1.5 pr-2 font-medium">Đặc biệt (2 ngày)</th>
                  <th className="py-1.5 pr-2 font-medium">Số ngày</th>
                  <th className="py-1.5 pr-2 font-medium">Giấy BHXH</th>
                  <th className="py-1.5 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.seq} className="border-t border-[var(--color-border-light)]">
                    <td className="py-1.5 pr-2 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{r.seq}</td>
                    <td className="py-1.5 pr-2"><input type="date" value={r.date} onChange={(e) => setRow(r.seq, { date: e.target.value })} className="fld !h-8" /></td>
                    <td className="py-1.5 pr-2">
                      <button onClick={() => setRow(r.seq, { special: !r.special })} disabled={!r.date} className={cn("rounded-[6px] border px-2 py-1 text-[11px] font-medium disabled:opacity-40", r.special ? "border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}>{r.special ? "Đặc biệt" : "Bình thường"}</button>
                    </td>
                    <td className="py-1.5 pr-2 font-[family-name:var(--font-mono)]">{r.date ? (r.special ? 2 : 1) : "—"}</td>
                    <td className="py-1.5 pr-2">
                      <button onClick={() => setRow(r.seq, { docSubmitted: !r.docSubmitted })} disabled={!r.date} className={cn("flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[11px] font-medium disabled:opacity-40", r.docSubmitted ? "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}>
                        {r.docSubmitted ? <><FileCheck2 size={12} /> Đã nộp</> : <><FileWarning size={12} /> Chưa nộp</>}
                      </button>
                    </td>
                    <td className="py-1.5"><input value={r.note} onChange={(e) => setRow(r.seq, { note: e.target.value })} placeholder="—" className="fld !h-8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-maternity)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} Lưu hồ sơ
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.fld){height:34px;width:100%;border:1px solid var(--color-border);border-radius:8px;padding:0 8px;font-size:12.5px;outline:none;background:white}
        :global(.fld:focus){border-color:var(--color-maternity)}
      `}</style>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--color-text-lighter)]">{label}</span>
      {children}
    </label>
  );
}

function RegisterModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { data } = useQuery(() => fetchAllEmployees(), []);
  const employees = useMemo(() => (data?.data ?? []).filter((e) => e.status !== "Nghỉ việc"), [data]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [notifiedDate, setNotifiedDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!employeeId) { setErr("Chọn nhân viên."); return; }
    setSaving(true);
    try {
      await createMaternity({ employeeId, notifiedDate: notifiedDate || null, dueDate: dueDate || null, status: "soon" });
      onSaved();
    } catch (e) {
      setErr((e as Error).message || "Lưu thất bại.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[14px] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Đăng ký theo dõi thai sản</div>
          <button onClick={onClose}><X size={18} className="text-[var(--color-text-lighter)]" /></button>
        </div>
        <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">Nhân viên</label>
        <select value={employeeId ?? ""} onChange={(e) => setEmployeeId(Number(e.target.value) || null)} className="mb-4 h-10 w-full rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-maternity)]">
          <option value="">— Chọn nhân viên —</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
        </select>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Ngày báo mang thai</span><input type="date" value={notifiedDate} onChange={(e) => setNotifiedDate(e.target.value)} className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-maternity)]" /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Ngày dự sinh</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-maternity)]" /></label>
        </div>
        {err && <div className="mb-3 rounded-[8px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}
        <div className="flex gap-2">
          <button onClick={submit} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--color-maternity)] py-2 text-[13px] font-medium text-white disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Đăng ký</button>
          <button onClick={onClose} className="flex-1 rounded-[8px] border border-[var(--color-border)] py-2 text-[13px] text-[var(--color-text-secondary)]">Huỷ</button>
        </div>
      </div>
    </div>
  );
}
