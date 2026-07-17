"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { fetchSalary, fetchDepartments, type ApiSalaryRow } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { DEFAULT_CFG, DEFAULT_PIT } from "@/lib/data/config";
import { formatMoney, cn } from "@/lib/utils";

function computePIT(taxable: number): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const bracket of DEFAULT_PIT) {
    const slice = Math.min(taxable, bracket.upTo) - prev;
    if (slice <= 0) break;
    tax += slice * bracket.rate;
    prev = bracket.upTo;
    if (taxable <= bracket.upTo) break;
  }
  return Math.round(tax);
}

interface SalaryComputed {
  workSalary: number;
  allowance: number;
  otWeekday: number;
  otSunday: number;
  otPay: number;
  kpiBonus: number;
  hotBonus: number;
  gross: number;
  insurance: number;
  taxableIncome: number;
  tax: number;
  advance: number;
  net: number;
  stdDays: number;
  actualDays: number;
}

function computeSalary(row: ApiSalaryRow): SalaryComputed {
  const base = row.base_salary ?? 0;
  const allowance = row.allowance ?? 0;
  const stdDays = row.std_days ?? DEFAULT_CFG.attendance.standardWorkDaysPerMonth;
  const actualDays = row.actual_days ?? stdDays;
  const insBase = row.ins_salary_base ?? base;
  const dependents = row.dependents ?? 0;
  const kpiBonus = row.kpi_bonus ?? 0;
  const hotBonus = row.hot_bonus ?? 0;
  const advance = row.advance ?? 0;

  const workSalary = Math.round(base / stdDays * actualDays);

  const hourlyRate = base / (stdDays * 8);
  const otWeekdayHours = row.ot_weekday_hours ?? 0;
  const otSundayHours = row.ot_sunday_hours ?? 0;
  const otWeekday = Math.round(otWeekdayHours * hourlyRate * 1.5);
  const otSunday = Math.round(otSundayHours * hourlyRate * 2.0);
  const otPay = otWeekday + otSunday;

  const gross = workSalary + allowance + otPay + kpiBonus + hotBonus;

  const { bhxhEmployeeRate, bhytEmployeeRate, bhtnEmployeeRate } = DEFAULT_CFG.insurance;
  const insurance = Math.round(insBase * (bhxhEmployeeRate + bhytEmployeeRate + bhtnEmployeeRate));

  const taxableIncome = Math.max(
    0,
    gross - insurance - DEFAULT_CFG.tax.personalDeduction - dependents * DEFAULT_CFG.tax.dependentDeduction,
  );
  const tax = computePIT(taxableIncome);
  const net = gross - insurance - tax - advance;

  return { workSalary, allowance, otWeekday, otSunday, otPay, kpiBonus, hotBonus, gross, insurance, taxableIncome, tax, advance, net, stdDays, actualDays };
}

type SalaryDisplayRow = { row: ApiSalaryRow; s: SalaryComputed };

export function SalaryScreen() {
  const [period, setPeriod] = useState("2026-06");
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [selected, setSelected] = useState<SalaryDisplayRow | null>(null);

  const { data, isLoading } = useQuery(() => fetchSalary(period), [period]);
  const { data: deptData } = useQuery(() => fetchDepartments(), []);

  const rows = useMemo<SalaryDisplayRow[]>(() => {
    if (!data?.data) return [];
    return data.data
      .filter((r) => !deptFilter || r.department_id === deptFilter)
      .map((row) => ({ row, s: computeSalary(row) }));
  }, [data, deptFilter]);

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const totalGross = rows.reduce((s, r) => s + r.s.gross, 0);
    const totalNet = rows.reduce((s, r) => s + r.s.net, 0);
    const totalIns = rows.reduce((s, r) => s + r.s.insurance, 0);
    const totalTax = rows.reduce((s, r) => s + r.s.tax, 0);
    return { totalGross, totalNet, totalIns, totalTax, count: rows.length };
  }, [rows]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Bảng lương kỳ {periodLabel}</div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          >
            <option value="">Tất cả phòng ban</option>
            {deptData?.data?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <span className="rounded-[20px] bg-[var(--color-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
          {rows.length} nhân viên
        </span>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng gross", value: formatMoney(totals.totalGross), color: "text-[var(--color-text-primary)]" },
            { label: "Tổng BHXH", value: formatMoney(totals.totalIns), color: "text-[var(--color-danger)]" },
            { label: "Tổng thuế", value: formatMoney(totals.totalTax), color: "text-[var(--color-danger)]" },
            { label: "Tổng thực nhận", value: formatMoney(totals.totalNet), color: "text-[var(--color-success)]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2.5">
              <div className={cn("text-[15px] font-semibold font-[family-name:var(--font-mono)]", s.color)}>{s.value}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
          <table className="w-full min-w-[1200px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                <th className="px-3 py-3 font-medium">Nhân viên</th>
                <th className="px-3 py-3 text-right font-medium">Công</th>
                <th className="px-3 py-3 text-right font-medium">Lương công</th>
                <th className="px-3 py-3 text-right font-medium">Phụ cấp</th>
                <th className="px-3 py-3 text-right font-medium">Tăng ca</th>
                <th className="px-3 py-3 text-right font-medium">Thưởng KPI</th>
                <th className="px-3 py-3 text-right font-medium">Tổng gộp</th>
                <th className="px-3 py-3 text-right font-medium">BHXH</th>
                <th className="px-3 py-3 text-right font-medium">Thuế</th>
                <th className="px-3 py-3 text-right font-medium">Tạm ứng</th>
                <th className="px-3 py-3 text-right font-medium">Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, s }) => (
                <tr
                  key={row.code}
                  onClick={() => setSelected({ row, s })}
                  className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[var(--color-text-primary)]">{row.name}</div>
                    <div className="text-[11px] text-[var(--color-text-lighter)]">{row.code}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[12px]">
                    {s.actualDays}/{s.stdDays}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.workSalary)}</td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.allowance)}</td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.otPay)}</td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                    {s.kpiBonus + s.hotBonus > 0 ? formatMoney(s.kpiBonus + s.hotBonus) : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-medium">
                    {formatMoney(s.gross)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                    -{formatMoney(s.insurance)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                    -{formatMoney(s.tax)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                    {s.advance > 0 ? `-${formatMoney(s.advance)}` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-success)]">
                    {formatMoney(s.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Phiếu lương — {selected.row.name}
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={18} className="text-[var(--color-text-lighter)]" />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Ngày công: {selected.s.actualDays}/{selected.s.stdDays}</span>
                <span>{selected.row.kpi_rank ? `KPI: ${selected.row.kpi_score} (${selected.row.kpi_rank})` : ""}</span>
              </div>
              <div className="h-px bg-[var(--color-border-light)]" />
              {([
                ["Lương theo công", selected.s.workSalary],
                ["Phụ cấp", selected.s.allowance],
                ["Tăng ca ngày thường", selected.s.otWeekday],
                ["Tăng ca CN", selected.s.otSunday],
                ["Thưởng KPI", selected.s.kpiBonus],
                ["Thưởng nóng", selected.s.hotBonus],
              ] as const).map(([label, val]) =>
                val > 0 ? (
                  <div key={label} className="flex justify-between text-[var(--color-text-muted)]">
                    <span>{label}</span>
                    <span className="font-[family-name:var(--font-mono)]">{formatMoney(val)}</span>
                  </div>
                ) : null
              )}
              <div className="flex justify-between border-t border-[var(--color-border-light)] pt-2 font-medium text-[var(--color-text-primary)]">
                <span>Tổng gộp</span>
                <span className="font-[family-name:var(--font-mono)]">{formatMoney(selected.s.gross)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-danger)]">
                <span>Khấu trừ BH ({((DEFAULT_CFG.insurance.bhxhEmployeeRate + DEFAULT_CFG.insurance.bhytEmployeeRate + DEFAULT_CFG.insurance.bhtnEmployeeRate) * 100).toFixed(1)}%)</span>
                <span className="font-[family-name:var(--font-mono)]">-{formatMoney(selected.s.insurance)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-danger)]">
                <span>Thuế TNCN</span>
                <span className="font-[family-name:var(--font-mono)]">-{formatMoney(selected.s.tax)}</span>
              </div>
              {selected.s.advance > 0 && (
                <div className="flex justify-between text-[var(--color-warning)]">
                  <span>Tạm ứng</span>
                  <span className="font-[family-name:var(--font-mono)]">-{formatMoney(selected.s.advance)}</span>
                </div>
              )}
              <div className={cn("flex justify-between border-t border-[var(--color-border-light)] pt-2 text-[15px] font-semibold text-[var(--color-success)]")}>
                <span>Thực nhận</span>
                <span className="font-[family-name:var(--font-mono)]">{formatMoney(selected.s.net)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
