"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Upload,
  Lock,
  Unlock,
  Users,
  UserCheck,
  UserMinus,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { employees } from "@/lib/data/employees";
import { hashName } from "@/lib/utils";

const STEPS = [
  { key: "attendance", label: "Chấm công" },
  { key: "leave", label: "Phép" },
  { key: "kpi", label: "KPI" },
  { key: "salary", label: "Lương" },
];

export function DashboardScreen() {
  const [locked, setLocked] = useState<Record<string, boolean>>({
    attendance: true,
    leave: true,
    kpi: false,
    salary: false,
  });

  const total = employees.length;
  const working = employees.filter((e) => e.status === "Đang làm việc").length;
  const onLeave = Math.max(0, total - working);

  const deptStats = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const d = e.department;
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, []);

  const topKpi = useMemo(() => {
    return [...employees]
      .map((e) => ({ ...e, score: 70 + (hashName(e.name) % 30) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, []);

  const watchList = useMemo(() => {
    return [...employees]
      .map((e) => ({ ...e, score: 40 + (hashName(e.name + "w") % 25) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }, []);

  const maxDept = Math.max(...deptStats.map(([, c]) => c), 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-navy)] text-[13px] font-bold text-white">
            TH
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY
            </div>
            <div className="text-[12px] text-[var(--color-text-light)]">Kỳ dữ liệu: Tháng 06/2026</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
            <Upload size={14} /> Nhập
          </button>
          <button className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
            <Download size={14} /> Xuất
          </button>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Chốt kỳ 06/2026</div>
          <span className="rounded-[20px] bg-[var(--color-warning-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-warning)]">
            Đang xử lý
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STEPS.map((step, idx) => {
            const isLocked = locked[step.key];
            return (
              <div key={step.key} className="rounded-[10px] border border-[var(--color-border-light)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-text-lighter)]">Bước {idx + 1}</span>
                  <button
                    onClick={() => setLocked((s) => ({ ...s, [step.key]: !s[step.key] }))}
                    className={
                      isLocked
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]"
                        : "flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-page-bg)] text-[var(--color-text-lighter)]"
                    }
                  >
                    {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </div>
                <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">{step.label}</div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-light)]">
                  {isLocked ? "Đã chốt" : "Chưa chốt"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Tổng nhân sự", value: total, icon: Users, color: "text-[var(--color-accent)]" },
          { label: "Đang làm", value: working, icon: UserCheck, color: "text-[var(--color-success)]" },
          { label: "Nghỉ phép", value: onLeave, icon: UserMinus, color: "text-[var(--color-warning)]" },
          { label: "Đi trễ hôm nay", value: 4, icon: Clock, color: "text-[var(--color-danger)]" },
          { label: "KPI TB tháng", value: "82.4", icon: TrendingUp, color: "text-[var(--color-accent)]" },
          { label: "Cảnh báo", value: 2, icon: AlertTriangle, color: "text-[var(--color-danger)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
            <s.icon size={16} className={s.color} />
            <div className="mt-2 font-[family-name:var(--font-mono)] text-[22px] font-semibold text-[var(--color-text-primary)]">
              {s.value}
            </div>
            <div className="text-[11.5px] text-[var(--color-text-light)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Nhân sự theo bộ phận</div>
          <div className="flex flex-col gap-2">
            {deptStats.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-28 truncate text-[11.5px] text-[var(--color-text-muted)]">{name}</div>
                <div className="h-2 flex-1 rounded-full bg-[var(--color-page-bg)]">
                  <div
                    className="h-2 rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${(count / maxDept) * 100}%` }}
                  />
                </div>
                <div className="w-6 text-right font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-text-secondary)]">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Chấm công hôm nay</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Đúng giờ", value: working - 4, color: "var(--color-success)" },
              { label: "Đi trễ", value: 4, color: "var(--color-warning)" },
              { label: "Vắng", value: 1, color: "var(--color-danger)" },
              { label: "Nghỉ phép", value: onLeave, color: "var(--color-accent)" },
            ].map((x) => (
              <div key={x.label} className="rounded-[10px] border border-[var(--color-border-light)] p-3">
                <div
                  className="font-[family-name:var(--font-mono)] text-[20px] font-semibold"
                  style={{ color: x.color }}
                >
                  {x.value}
                </div>
                <div className="text-[11px] text-[var(--color-text-light)]">{x.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Top KPI xuất sắc</div>
          <div className="flex flex-col">
            {topKpi.map((e, i) => (
              <div
                key={e.code ?? i}
                className="flex items-center justify-between border-b border-[var(--color-border-light)] py-2 last:border-0"
              >
                <div className="text-[12.5px] text-[var(--color-text-secondary)]">
                  {i + 1}. {e.name}
                </div>
                <div className="font-[family-name:var(--font-mono)] text-[12.5px] font-semibold text-[var(--color-success)]">
                  {e.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Watch list</div>
          <div className="flex flex-col">
            {watchList.map((e, i) => (
              <div
                key={e.code ?? i}
                className="flex items-center justify-between border-b border-[var(--color-border-light)] py-2 last:border-0"
              >
                <div className="text-[12.5px] text-[var(--color-text-secondary)]">{e.name}</div>
                <div className="font-[family-name:var(--font-mono)] text-[12.5px] font-semibold text-[var(--color-danger)]">
                  {e.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
