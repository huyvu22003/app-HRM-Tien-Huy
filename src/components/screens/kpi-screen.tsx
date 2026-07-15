"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { employees } from "@/lib/data/employees";
import { hashName, cn } from "@/lib/utils";

export function KpiScreen() {
  const rows = useMemo(() => {
    const withScore = employees.map((e) => {
      const h = hashName(e.name);
      const score = 55 + (h % 45);
      return {
        e,
        score,
        signedLead: h % 3 !== 0,
        signedHr: h % 5 !== 0,
      };
    });
    return withScore.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  }, []);

  const deptSummary = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    rows.forEach((r) => {
      const d = r.e.department;
      const cur = map.get(d) ?? { sum: 0, count: 0 };
      map.set(d, { sum: cur.sum + r.score, count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, avg: Math.round(v.sum / v.count), count: v.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [rows]);

  function scoreColor(score: number) {
    if (score >= 85) return "text-[var(--color-success)]";
    if (score >= 65) return "text-[var(--color-warning)]";
    return "text-[var(--color-danger)]";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Xếp hạng theo bộ phận</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {deptSummary.slice(0, 8).map((d) => (
            <div key={d.name} className="rounded-[10px] border border-[var(--color-border-light)] p-3">
              <div className="truncate text-[12px] text-[var(--color-text-muted)]">{d.name}</div>
              <div className={cn("font-[family-name:var(--font-mono)] text-[18px] font-semibold", scoreColor(d.avg))}>
                {d.avg}
              </div>
              <div className="text-[11px] text-[var(--color-text-lighter)]">{d.count} người</div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-[800px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-4 py-3 font-medium">Hạng</th>
              <th className="px-4 py-3 font-medium">Nhân viên</th>
              <th className="px-4 py-3 font-medium">Bộ phận</th>
              <th className="px-4 py-3 text-right font-medium">Điểm KPI</th>
              <th className="px-4 py-3 font-medium">Ký duyệt tổ trưởng</th>
              <th className="px-4 py-3 font-medium">Ký duyệt HR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.e.code} className="border-t border-[var(--color-border-light)]">
                <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                  {r.rank}
                </td>
                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{r.e.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{r.e.department}</td>
                <td className={cn("px-4 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold", scoreColor(r.score))}>
                  {r.score}
                </td>
                <td className="px-4 py-2.5">
                  {r.signedLead ? (
                    <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                  ) : (
                    <Clock size={15} className="text-[var(--color-text-lighter)]" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.signedHr ? (
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
    </div>
  );
}
