"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatMoney, cn } from "@/lib/utils";
import { FX_ORDER, FX_SRC, FX_LABEL, DEFAULT_PIT } from "@/lib/data/config";

export function FormulaScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [pitEnabled, setPitEnabled] = useState(true);
  const [brackets, setBrackets] = useState(
    DEFAULT_PIT.map((b) => ({ upTo: b.upTo, rate: Math.round(b.rate * 100) }))
  );

  // Sample employee preview computed with the same formula chain
  const sample = { base: 8_000_000, allowance: 500_000, ot: 900_000 };
  const gross = sample.base + sample.allowance + sample.ot;
  const ins = Math.round(sample.base * 0.105);
  const taxable = Math.max(0, gross - ins - 11_000_000);
  const tax = pitEnabled ? Math.round(taxable * (brackets[0].rate / 100)) : 0;
  const net = gross - ins - tax;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-4 text-[13px] font-semibold text-[var(--color-text-primary)]">Chuỗi công thức tính lương</div>
        <div className="flex flex-wrap items-stretch gap-2">
          {FX_ORDER.map((key, i) => {
            const isTax = key === "personalIncomeTax";
            return (
              <div key={key} className="flex items-center gap-2">
                <button
                  onClick={() => isTax && onNavigate("formula")}
                  className={cn(
                    "w-48 rounded-[12px] border p-3 text-left",
                    isTax
                      ? "border-[var(--color-border-light)] bg-[var(--color-page-bg)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  )}
                >
                  <div className="text-[12.5px] font-medium text-[var(--color-text-primary)]">{FX_LABEL[key]}</div>
                  <div className="mt-1 truncate font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-text-light)]">
                    {FX_SRC[key]}
                  </div>
                </button>
                {i < FX_ORDER.length - 1 && (
                  <ArrowRight size={14} className="shrink-0 text-[var(--color-text-lighter)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Biểu thuế TNCN luỹ tiến</div>
          <button
            onClick={() => setPitEnabled((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              pitEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                pitEnabled ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="py-2 font-medium">Bậc</th>
              <th className="py-2 font-medium">Đến mức thu nhập</th>
              <th className="py-2 text-right font-medium">Thuế suất</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b, i) => (
              <tr key={i} className="border-t border-[var(--color-border-light)]">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-[family-name:var(--font-mono)]">
                  {Number.isFinite(b.upTo) ? formatMoney(b.upTo) : "Trở lên"}
                </td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    value={b.rate}
                    disabled={!pitEnabled}
                    onChange={(e) =>
                      setBrackets((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, rate: Number(e.target.value) } : x))
                      )
                    }
                    className="w-14 rounded-[6px] border border-[var(--color-border)] px-1.5 py-0.5 text-right disabled:opacity-50"
                  />
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
          Xem trước — nhân viên mẫu
        </div>
        <div className="flex flex-wrap items-center gap-6 text-[12.5px]">
          <div>
            <span className="text-[var(--color-text-light)]">Tổng gộp </span>
            <span className="font-[family-name:var(--font-mono)] font-medium">{formatMoney(gross)}</span>
          </div>
          <ArrowRight size={14} className="text-[var(--color-text-lighter)]" />
          <div>
            <span className="text-[var(--color-text-light)]">BHXH </span>
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">-{formatMoney(ins)}</span>
          </div>
          <ArrowRight size={14} className="text-[var(--color-text-lighter)]" />
          <div>
            <span className="text-[var(--color-text-light)]">Thuế </span>
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">-{formatMoney(tax)}</span>
          </div>
          <ArrowRight size={14} className="text-[var(--color-text-lighter)]" />
          <div>
            <span className="text-[var(--color-text-light)]">Thực nhận </span>
            <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-success)]">
              {formatMoney(net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
