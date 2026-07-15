"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Users } from "lucide-react";
import { employees, type Employee } from "@/lib/data/employees";
import { BLOCKS } from "@/lib/data/departments";
import { getInitials, cn } from "@/lib/utils";

export function OrgScreen({ onNavigate }: { onNavigate: (screen: string, id?: string) => void }) {
  const structure = useMemo(() => {
    return BLOCKS.map((b) => ({
      block: b.name,
      departments: b.depts.map((dept) => ({
        dept,
        staff: employees.filter((e: Employee) => e.department === dept),
      })),
    }));
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeDept, setActiveDept] = useState<{ block: string; dept: string; staff: Employee[] } | null>(
    structure[0]?.departments[0]
      ? { block: structure[0].block, dept: structure[0].departments[0].dept, staff: structure[0].departments[0].staff }
      : null
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Cơ cấu tổ chức</div>
        <div className="flex flex-col gap-1">
          {structure.map((b) => {
            const isOpen = expanded[b.block] ?? true;
            const total = b.departments.reduce((sum, d) => sum + d.staff.length, 0);
            return (
              <div key={b.block}>
                <button
                  onClick={() => setExpanded((s) => ({ ...s, [b.block]: !isOpen }))}
                  className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left hover:bg-[var(--color-page-bg)]"
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-primary)]">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {b.block}
                  </div>
                  <span className="text-[11px] text-[var(--color-text-light)]">{total}</span>
                </button>
                {isOpen && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-[var(--color-border-light)] pl-2">
                    {b.departments.map((d) => (
                      <button
                        key={d.dept}
                        onClick={() => setActiveDept({ block: b.block, dept: d.dept, staff: d.staff })}
                        className={cn(
                          "flex items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[12.5px]",
                          activeDept?.dept === d.dept
                            ? "bg-[var(--color-accent)] text-white"
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                        )}
                      >
                        <span className="truncate">{d.dept}</span>
                        <span className="text-[11px] opacity-80">{d.staff.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        {activeDept ? (
          <>
            <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
              <Users size={17} className="text-[var(--color-accent)]" />
              {activeDept.dept}
            </div>
            <div className="mb-4 text-[12.5px] text-[var(--color-text-light)]">
              {activeDept.block} · {activeDept.staff.length} nhân sự
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {activeDept.staff.map((s) => (
                <button
                  key={s.code}
                  onClick={() => onNavigate("employee-detail", s.code)}
                  className="flex items-center gap-2.5 rounded-[10px] border border-[var(--color-border-light)] p-2.5 text-left hover:border-[var(--color-accent)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                    {getInitials(s.name ?? "?")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      {s.name}
                    </div>
                    <div className="truncate text-[11px] text-[var(--color-text-light)]">
                      {s.position ?? "Nhân viên"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[13px] text-[var(--color-text-muted)]">Chọn một bộ phận để xem chi tiết.</div>
        )}
      </div>
    </div>
  );
}
