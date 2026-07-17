"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { fetchKpi, type ApiKpi } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function KpiScreen() {
  const [period, setPeriod] = useState("2026-06");

  const { data, isLoading } = useQuery(() => fetchKpi(period), [period]);

  const rows = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, computedRank: i + 1 }));
  }, [data]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  function scoreColor(score: number) {
    if (score >= 85) return "text-[var(--color-success)]";
    if (score >= 65) return "text-[var(--color-warning)]";
    return "text-[var(--color-danger)]";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">KPI kỳ {periodLabel}</div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
            <table className="w-full min-w-[800px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                  <th className="px-4 py-3 font-medium">Hạng</th>
                  <th className="px-4 py-3 font-medium">Nhân viên</th>
                  <th className="px-4 py-3 font-medium">Mã NV</th>
                  <th className="px-4 py-3 text-right font-medium">Điểm KPI</th>
                  <th className="px-4 py-3 font-medium">Ký duyệt tổ trưởng</th>
                  <th className="px-4 py-3 font-medium">Ký duyệt HR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                    <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                      {r.computedRank}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{r.employee_name}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{r.employee_code}</td>
                    <td className={cn("px-4 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold", scoreColor(r.score))}>
                      {r.score}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signed_l1 ? (
                        <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                      ) : (
                        <Clock size={15} className="text-[var(--color-text-lighter)]" />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.signed_l2 ? (
                        <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                      ) : (
                        <Clock size={15} className="text-[var(--color-text-lighter)]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
