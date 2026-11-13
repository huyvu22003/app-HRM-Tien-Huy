"use client";

import { useState } from "react";
import { CalendarDays, Clock3, Loader2, Lock, UserRound } from "lucide-react";
import { fetchAttendance, fetchAttendancePeriods } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatMoney } from "@/lib/utils";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function number(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function MyAttendanceScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const { data: periodsData } = useQuery(fetchAttendancePeriods, []);
  const period = selectedPeriod ?? periodsData?.data?.[0] ?? (periodsData ? currentPeriod() : "");
  const { data, isLoading } = useQuery(
    () => (period ? fetchAttendance(period) : Promise.resolve({ data: [], period: "" })),
    [period],
  );
  const row = data?.data?.[0] ?? null;
  const periodLabel = period ? `${period.slice(5)}/${period.slice(0, 4)}` : "";

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[var(--color-accent)]" /></div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-4">
        <div>
          <div className="text-[16px] font-semibold text-[var(--color-text-primary)]">Bảng công cá nhân</div>
          <div className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">Chỉ hiển thị dữ liệu của tài khoản đang đăng nhập.</div>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
          Kỳ công
          <input type="month" value={period} onChange={(event) => setSelectedPeriod(event.target.value)} className="h-9 rounded-[8px] border border-[var(--color-border)] px-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]" />
        </label>
      </div>

      {!row ? (
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-10 text-center text-[13px] text-[var(--color-text-muted)]">
          Chưa có dữ liệu chấm công kỳ {periodLabel}.
        </div>
      ) : (
        <>
          <div className="rounded-[14px] bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-accent)] p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"><UserRound size={22} /></div>
                <div><div className="text-[17px] font-semibold">{row.employee_name}</div><div className="text-[12px] text-white/75">Mã nhân viên: {row.employee_code} · Kỳ {periodLabel}</div></div>
              </div>
              {row.locked === 1 && <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px]"><Lock size={13} /> Đã chốt</span>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Summary label="Công chuẩn" value={number(row.std_days)} icon={<CalendarDays size={16} />} />
              <Summary label="Ngày công" value={number(row.actual_days)} icon={<Clock3 size={16} />} />
              <Summary label="Tổng ngày nghỉ" value={number(row.pn + row.pb + row.vr + row.kp)} icon={<CalendarDays size={16} />} />
              <Summary label="Tổng giờ OT" value={number((row.ot_weekday_hours ?? 0) + (row.ot_sunday_hours ?? 0) + (row.ot_holiday_hours ?? 0))} icon={<Clock3 size={16} />} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Chi tiết ngày công" rows={[
              ["Phép năm (PN)", number(row.pn)], ["Phép bệnh (PB)", number(row.pb)], ["Việc riêng (VR)", number(row.vr)],
              ["Không phép (KP)", number(row.kp)], ["Phép cưới (PC)", number(row.pc)], ["Phép tang (PT)", number(row.pt)],
              ["Tai nạn lao động", number(row.tnld)], ["Khám thai (PTS)", number(row.pts)],
            ]} />
            <Section title="Tăng ca và phụ cấp" rows={[
              ["OT ngày thường", `${number(row.ot_weekday_hours)} giờ`], ["OT chủ nhật", `${number(row.ot_sunday_hours)} giờ`],
              ["OT ngày lễ", `${number(row.ot_holiday_hours)} giờ`], ["Ngày xăng xe", number(row.gas_days)],
              ["Tiền cơm tăng ca", `${formatMoney(row.meal_allowance ?? 0)} đ`],
            ]} />
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-[10px] bg-white/10 p-3"><div className="flex items-center gap-1.5 text-[11px] text-white/70">{icon}{label}</div><div className="mt-1 font-[family-name:var(--font-mono)] text-[20px] font-semibold">{value}</div></div>;
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-4"><div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</div>{rows.map(([label, value]) => <div key={label} className="flex justify-between border-b border-[var(--color-border-light)] py-2.5 last:border-0"><span className="text-[12.5px] text-[var(--color-text-muted)]">{label}</span><span className="font-[family-name:var(--font-mono)] text-[12.5px] font-medium">{value}</span></div>)}</div>;
}
