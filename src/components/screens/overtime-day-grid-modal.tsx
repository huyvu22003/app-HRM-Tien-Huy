"use client";

import { useMemo, useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOvertimeDaily, saveOvertimeDaily, type ApiAttendance, type OvertimeTotals } from "@/lib/api";
import { useQuery } from "@/lib/hooks";

const MEAL_LONG = 25000;
const MEAL_SHORT = 10000;
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function mealForHours(h: number): number {
  const t = Math.round(h * 2) / 2;
  if (t === 1 || t === 1.5) return MEAL_SHORT;
  if (t >= 2 && t <= 5) return MEAL_LONG;
  return 0;
}
const money = (v: number) => Math.round(v).toLocaleString("vi-VN");

/**
 * Lưới tăng ca theo NGÀY cho 1 nhân viên trong 1 kỳ (dạng lịch). Nhập số giờ OT
 * mỗi ngày; app tự tách OT ngày thường / chủ nhật + tính tiền cơm. OT lễ nhập ở
 * ô tổng riêng. Lưu xong ghi về bảng chấm công để bảng lương khớp.
 */
export function OvertimeDayGridModal({
  row,
  onSaved,
  onClose,
}: {
  row: ApiAttendance;
  onSaved: (totals: OvertimeTotals) => void;
  onClose: () => void;
}) {
  const [y, m] = row.period.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay(); // 0=CN

  const { data, isLoading } = useQuery(
    () => fetchOvertimeDaily(row.employee_id, row.period),
    [row.employee_id, row.period],
  );

  // Khởi tạo giờ theo ngày từ dữ liệu server (chỉ set 1 lần khi data về).
  const [hours, setHours] = useState<Record<number, string> | null>(null);
  const [holiday, setHoliday] = useState<string>(String(row.ot_holiday_hours ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveHours: Record<number, string> = useMemo(() => {
    if (hours) return hours;
    const init: Record<number, string> = {};
    for (const d of data?.data ?? []) init[d.day] = String(d.hours);
    return init;
  }, [hours, data]);

  const setDay = (day: number, val: string) =>
    setHours({ ...effectiveHours, [day]: val });

  const isSunday = (day: number) => new Date(y, m - 1, day).getDay() === 0;

  const totals = useMemo(() => {
    let weekday = 0;
    let sunday = 0;
    let meal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const h = Number(effectiveHours[d]) || 0;
      if (h <= 0) continue;
      if (isSunday(d)) sunday += h;
      else weekday += h;
      meal += mealForHours(h);
    }
    const hol = Number(holiday) || 0;
    return {
      weekday: +weekday.toFixed(2),
      sunday: +sunday.toFixed(2),
      holiday: +hol.toFixed(2),
      total: +(weekday + sunday + hol).toFixed(2),
      meal,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveHours, holiday, daysInMonth]);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const days = Object.entries(effectiveHours)
        .map(([day, h]) => ({ day: Number(day), hours: Number(h) || 0 }))
        .filter((d) => d.hours > 0);
      const res = await saveOvertimeDaily({
        employeeId: row.employee_id,
        period: row.period,
        days,
        holidayHours: Number(holiday) || 0,
      });
      onSaved(res.totals);
    } catch (e) {
      setErr((e as Error).message || "Lưu thất bại");
      setSaving(false);
    }
  }

  const blanks = Array.from({ length: firstDow });
  const cells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-8 w-full max-w-[640px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Tăng ca theo ngày</div>
            <div className="text-[12.5px] text-[var(--color-text-muted)]">
              {row.employee_name} · {row.employee_code} · Kỳ {row.period.split("-")[1]}/{row.period.split("-")[0]}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
        </div>

        <div className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[var(--color-page-bg)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>Nhập số <b>giờ OT</b> mỗi ngày (bổ sung ngày quên chấm tại đây). Ngày <b className="text-[var(--color-danger)]">CN</b> tính OT chủ nhật; còn lại là ngày thường. Tiền cơm tự tính theo từng buổi.</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--color-accent)]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1">
              {WD.map((w, i) => (
                <div key={w} className={cn("py-1 text-center text-[10.5px] font-medium uppercase", i === 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-lighter)]")}>{w}</div>
              ))}
              {blanks.map((_, i) => <div key={`b${i}`} />)}
              {cells.map((d) => {
                const sun = isSunday(d);
                const h = effectiveHours[d] ?? "";
                return (
                  <div key={d} className={cn("flex flex-col gap-0.5 rounded-[8px] border p-1", sun ? "border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)]/40" : "border-[var(--color-border-light)]", Number(h) > 0 && "ring-1 ring-[var(--color-accent)]")}>
                    <span className={cn("text-[10px] leading-none", sun ? "text-[var(--color-danger)]" : "text-[var(--color-text-lighter)]")}>{d}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={h}
                      placeholder="0"
                      onChange={(e) => setDay(d, e.target.value)}
                      className="w-full rounded-[5px] border border-[var(--color-border)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4 rounded-[10px] bg-[var(--color-page-bg)] px-3 py-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-[var(--color-text-muted)]">OT lễ (giờ)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={holiday}
                  onChange={(e) => setHoliday(e.target.value)}
                  className="h-8 w-24 rounded-[8px] border border-[var(--color-border)] px-2 text-right text-[13px] font-[family-name:var(--font-mono)] outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <div className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
                <Total label="OT ngày thường" value={`${totals.weekday}h`} />
                <Total label="OT chủ nhật" value={`${totals.sunday}h`} />
                <Total label="OT lễ" value={`${totals.holiday}h`} />
                <Total label="Tổng OT" value={`${totals.total}h`} strong />
                <Total label="Tiền cơm TC" value={`${money(totals.meal)} đ`} />
              </div>
            </div>
          </>
        )}

        {err && <div className="mt-3 rounded-[8px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{err}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]">Huỷ</button>
          <button onClick={handleSave} disabled={saving || isLoading} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />} Lưu tăng ca
          </button>
        </div>
      </div>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">{label}</span>
      <span className={cn("font-[family-name:var(--font-mono)]", strong ? "text-[13.5px] font-semibold text-[var(--color-accent)]" : "text-[13px] text-[var(--color-text-primary)]")}>{value}</span>
    </div>
  );
}
