"use client";

import { useMemo, useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import type { ApiAttendance } from "@/lib/api";

/**
 * Bảng điều chỉnh chấm công 1 nhân viên. Cho HR bổ sung/điều chỉnh khi NV quên
 * chấm OT, chấm trễ hoặc thiếu giờ ra. KP và Tổng OT tự tính lại theo thời gian
 * thực; khi lưu, server cũng tính lại để luôn khớp bảng lương.
 */

type FieldKey =
  | "std_days"
  | "actual_days"
  | "pn"
  | "pb"
  | "vr"
  | "pc"
  | "pts"
  | "pt"
  | "tnld"
  | "ot_weekday_hours"
  | "ot_sunday_hours"
  | "ot_holiday_hours"
  | "gas_days"
  | "meal_allowance";

const num = (v: number | null | undefined) => (v == null ? 0 : Number(v));

export function AttendanceEditModal({
  row,
  onSave,
  onClose,
}: {
  row: ApiAttendance;
  onSave: (id: number, payload: Record<string, number | string>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<FieldKey, string>>({
    std_days: String(num(row.std_days)),
    actual_days: String(num(row.actual_days)),
    pn: String(num(row.pn)),
    pb: String(num(row.pb)),
    vr: String(num(row.vr)),
    pc: String(num(row.pc)),
    pts: String(num(row.pts)),
    pt: String(num(row.pt)),
    tnld: String(num(row.tnld)),
    ot_weekday_hours: String(num(row.ot_weekday_hours)),
    ot_sunday_hours: String(num(row.ot_sunday_hours)),
    ot_holiday_hours: String(num(row.ot_holiday_hours)),
    gas_days: String(num(row.gas_days)),
    meal_allowance: String(num(row.meal_allowance)),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const v = (k: FieldKey) => {
    const n = Number(form[k]);
    return Number.isFinite(n) ? n : 0;
  };
  const set = (k: FieldKey, val: string) => setForm((s) => ({ ...s, [k]: val }));

  // Giá trị dẫn xuất (khớp công thức server).
  const kp = useMemo(
    () =>
      Math.max(
        0,
        +(
          v("std_days") - v("actual_days") - v("pn") - v("pb") - v("vr") - v("pc") - v("pts") - v("pt") - v("tnld")
        ).toFixed(2),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form],
  );
  const otTotal = useMemo(
    () => +(v("ot_weekday_hours") + v("ot_sunday_hours") + v("ot_holiday_hours")).toFixed(2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form],
  );

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      await onSave(row.id, {
        // Gửi kèm nhân viên + kỳ để API tự tạo bản ghi nếu chưa có (upsert),
        // tránh lỗi 404 khi dòng chấm công gốc chưa tồn tại / đã cũ.
        employeeId: row.employee_id,
        period: row.period,
        stdDays: v("std_days"),
        actualDays: v("actual_days"),
        pn: v("pn"),
        pb: v("pb"),
        vr: v("vr"),
        pc: v("pc"),
        pts: v("pts"),
        pt: v("pt"),
        tnld: v("tnld"),
        otWeekdayHours: v("ot_weekday_hours"),
        otSundayHours: v("ot_sunday_hours"),
        otHolidayHours: v("ot_holiday_hours"),
        gasDays: v("gas_days"),
        mealAllowance: v("meal_allowance"),
      });
    } catch (e) {
      setErr((e as Error).message || "Lưu thất bại");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-8 w-full max-w-[560px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Điều chỉnh chấm công</div>
            <div className="text-[12.5px] text-[var(--color-text-muted)]">
              {row.employee_name} · {row.employee_code} · Kỳ {row.period.split("-")[1]}/{row.period.split("-")[0]}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
        </div>

        <div className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[var(--color-page-bg)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>Dùng để bổ sung OT quên chấm, chấm trễ hoặc thiếu giờ ra. <b>KP</b> và <b>Tổng OT</b> tự tính lại theo các ô bên dưới.</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <Section title="Công">
            <NumField label="Công chuẩn" value={form.std_days} onChange={(x) => set("std_days", x)} />
            <NumField label="Tổng N.C" value={form.actual_days} onChange={(x) => set("actual_days", x)} />
          </Section>

          <Section title="Nghỉ phép">
            <NumField label="PN (phép năm)" value={form.pn} onChange={(x) => set("pn", x)} />
            <NumField label="PB (phép bệnh)" value={form.pb} onChange={(x) => set("pb", x)} />
            <NumField label="VR (việc riêng)" value={form.vr} onChange={(x) => set("vr", x)} />
            <NumField label="PC (phép cưới)" value={form.pc} onChange={(x) => set("pc", x)} />
            <NumField label="PT (phép tang)" value={form.pt} onChange={(x) => set("pt", x)} />
            <NumField label="TNLĐ (tai nạn LĐ)" value={form.tnld} onChange={(x) => set("tnld", x)} />
            <NumField label="PTS (thai sản)" value={form.pts} onChange={(x) => set("pts", x)} />
            <Derived label="KP (không phép)" value={kp} hint="= Chuẩn − N.C − PN − PB − VR − PC − PT − TNLĐ − PTS" />
          </Section>

          <Section title="Tăng ca (giờ)">
            <NumField label="OT ngày thường" value={form.ot_weekday_hours} onChange={(x) => set("ot_weekday_hours", x)} />
            <NumField label="OT chủ nhật" value={form.ot_sunday_hours} onChange={(x) => set("ot_sunday_hours", x)} />
            <NumField label="OT lễ" value={form.ot_holiday_hours} onChange={(x) => set("ot_holiday_hours", x)} />
            <Derived label="Tổng OT" value={otTotal} hint="= NT + CN + Lễ" />
          </Section>

          <Section title="Phụ cấp">
            <NumField label="Xăng xe (ngày)" value={form.gas_days} onChange={(x) => set("gas_days", x)} />
            <NumField label="Tiền cơm TC (đ)" value={form.meal_allowance} onChange={(x) => set("meal_allowance", x)} step={1000} />
          </Section>
        </div>

        {err && <div className="mt-3 rounded-[8px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]">Huỷ</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />} Lưu điều chỉnh
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-lighter)]">{title}</div>
      <div className="grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange, step = 0.5 }: { label: string; value: string; onChange: (v: string) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-[var(--color-text-muted)]">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-[8px] border border-[var(--color-border)] px-2 text-right text-[13px] font-[family-name:var(--font-mono)] outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );
}

function Derived({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-[var(--color-text-muted)]">{label}</span>
      <div title={hint} className="flex h-8 items-center justify-end rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-page-bg)] px-2 text-[13px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">
        {value}
      </div>
    </label>
  );
}
