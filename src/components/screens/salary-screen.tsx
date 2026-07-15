"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { employees, type Employee } from "@/lib/data/employees";
import { hashName, formatMoney, cn } from "@/lib/utils";

function computeSalary(e: Employee) {
  const h = hashName(e.name);
  const base = e.baseSalary || 5_000_000 + (h % 8) * 500_000;
  const allowance = e.allowance || 300_000 + (h % 5) * 100_000;
  const otHours = h % 20;
  const otPay = otHours * 45_000;
  const kpiBonus = 200_000 + (h % 6) * 100_000;
  const gross = base + allowance + otPay + kpiBonus;
  const insurance = Math.round(base * 0.105);
  const taxableIncome = Math.max(0, gross - insurance - 11_000_000);
  const tax = Math.round(taxableIncome * 0.05);
  const net = gross - insurance - tax;
  return { base, allowance, otPay, kpiBonus, gross, insurance, tax, net };
}

type SalaryRow = { e: Employee; s: ReturnType<typeof computeSalary> };

export function SalaryScreen() {
  const [selected, setSelected] = useState<SalaryRow | null>(null);

  const rows = useMemo<SalaryRow[]>(
    () => employees.map((e) => ({ e, s: computeSalary(e) })),
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Bảng lương kỳ 06/2026</div>
        <span className="rounded-[20px] bg-[var(--color-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
          Đã tính lương
        </span>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-[1000px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-4 py-3 font-medium">Nhân viên</th>
              <th className="px-4 py-3 text-right font-medium">Lương cơ bản</th>
              <th className="px-4 py-3 text-right font-medium">Phụ cấp</th>
              <th className="px-4 py-3 text-right font-medium">Tăng ca</th>
              <th className="px-4 py-3 text-right font-medium">Thưởng KPI</th>
              <th className="px-4 py-3 text-right font-medium">Tổng gộp</th>
              <th className="px-4 py-3 text-right font-medium">BHXH</th>
              <th className="px-4 py-3 text-right font-medium">Thuế TNCN</th>
              <th className="px-4 py-3 text-right font-medium">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, s }) => (
              <tr
                key={e.code}
                onClick={() => setSelected({ e, s })}
                className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
              >
                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{e.name}</td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.base)}</td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.allowance)}</td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.otPay)}</td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.kpiBonus)}</td>
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

      {selected && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Phiếu lương — {selected.e.name}
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
                ["Thưởng KPI", selected.s.kpiBonus],
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
                <span>BHXH (10.5%)</span>
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
