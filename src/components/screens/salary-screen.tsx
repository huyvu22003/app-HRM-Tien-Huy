"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { fetchSalary, type ApiSalaryRow } from "@/lib/api";
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
  base: number;
  allowance: number;
  otPay: number;
  gross: number;
  insurance: number;
  taxableIncome: number;
  tax: number;
  net: number;
}

function computeSalary(row: ApiSalaryRow): SalaryComputed {
  const base = row.base_salary ?? 0;
  const allowance = row.allowance ?? 0;
  const otHours = row.overtime_hours ?? 0;
  const insBase = row.ins_salary_base ?? base;
  const dependents = row.dependents ?? 0;

  const hourlyRate = base / (DEFAULT_CFG.attendance.standardWorkDaysPerMonth * 8);
  const otPay = Math.round(otHours * hourlyRate * 1.5);

  const gross = base + allowance + otPay;

  const { bhxhEmployeeRate, bhytEmployeeRate, bhtnEmployeeRate } = DEFAULT_CFG.insurance;
  const insurance = Math.round(insBase * (bhxhEmployeeRate + bhytEmployeeRate + bhtnEmployeeRate));

  const taxableIncome = Math.max(
    0,
    gross - insurance - DEFAULT_CFG.tax.personalDeduction - dependents * DEFAULT_CFG.tax.dependentDeduction,
  );
  const tax = computePIT(taxableIncome);
  const net = gross - insurance - tax;

  return { base, allowance, otPay, gross, insurance, taxableIncome, tax, net };
}

type SalaryDisplayRow = { row: ApiSalaryRow; s: SalaryComputed };

export function SalaryScreen() {
  const [period, setPeriod] = useState("2026-06");
  const [selected, setSelected] = useState<SalaryDisplayRow | null>(null);

  const { data, isLoading } = useQuery(() => fetchSalary(period), [period]);

  const rows = useMemo<SalaryDisplayRow[]>(() => {
    if (!data?.data) return [];
    return data.data.map((row) => ({ row, s: computeSalary(row) }));
  }, [data]);

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
        </div>
        <span className="rounded-[20px] bg-[var(--color-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
          Đã tính lương
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
          <table className="w-full min-w-[1000px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                <th className="px-4 py-3 font-medium">Nhân viên</th>
                <th className="px-4 py-3 text-right font-medium">Lương cơ bản</th>
                <th className="px-4 py-3 text-right font-medium">Phụ cấp</th>
                <th className="px-4 py-3 text-right font-medium">Tăng ca</th>
                <th className="px-4 py-3 text-right font-medium">Tổng gộp</th>
                <th className="px-4 py-3 text-right font-medium">BHXH</th>
                <th className="px-4 py-3 text-right font-medium">Thuế TNCN</th>
                <th className="px-4 py-3 text-right font-medium">Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, s }) => (
                <tr
                  key={row.code}
                  onClick={() => setSelected({ row, s })}
                  className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.base)}</td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.allowance)}</td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.otPay)}</td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] font-medium">
                    {formatMoney(s.gross)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                    -{formatMoney(s.insurance)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                    -{formatMoney(s.tax)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-success)]">
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
              {[
                ["Lương cơ bản", selected.s.base],
                ["Phụ cấp", selected.s.allowance],
                ["Tăng ca", selected.s.otPay],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-[var(--color-text-muted)]">
                  <span>{label}</span>
                  <span className="font-[family-name:var(--font-mono)]">{formatMoney(val as number)}</span>
                </div>
              ))}
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
