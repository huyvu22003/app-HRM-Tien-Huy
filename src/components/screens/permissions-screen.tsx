"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_META, PERM_MODULES, PERM_ROLE_DEFAULT } from "@/lib/data/config";
import type { Role } from "@/lib/data/accounts";

const ROLES: Role[] = ["super", "hr", "lead", "staff"];

const ACTION_LABEL: Record<string, string> = {
  view: "Xem",
  create: "Thêm",
  edit: "Sửa",
  delete: "Xoá",
  export: "Xuất",
  approve: "Duyệt",
  reject: "Từ chối",
  request: "Gửi yêu cầu",
};

function cloneDefault(): Record<Role, Record<string, string[]>> {
  return JSON.parse(JSON.stringify(PERM_ROLE_DEFAULT));
}

export function PermissionsScreen() {
  const initial = useMemo(() => cloneDefault(), []);
  const [matrix, setMatrix] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  function hasAny(role: Role, moduleId: string) {
    return (matrix[role][moduleId]?.length ?? 0) > 0;
  }

  function toggleModule(role: Role, moduleId: string, allActions: readonly string[]) {
    if (role === "super") return;
    setMatrix((m) => {
      const current = m[role][moduleId] ?? [];
      const next = current.length > 0 ? [] : [...allActions];
      return { ...m, [role]: { ...m[role], [moduleId]: next } };
    });
    setDirty(true);
  }

  function toggleAction(role: Role, moduleId: string, action: string) {
    if (role === "super") return;
    setMatrix((m) => {
      const current = m[role][moduleId] ?? [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...m, [role]: { ...m[role], [moduleId]: next } };
    });
    setDirty(true);
  }

  function reset() {
    setMatrix(initial);
    setDirty(false);
  }

  function save() {
    setDirty(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {dirty && (
        <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-2.5 text-[12.5px] text-[var(--color-warning)]">
          <AlertTriangle size={15} />
          Bạn có thay đổi chưa lưu.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Ma trận phân quyền</div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-white"
          >
            Đặt lại
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className="rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-[700px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-4 py-3 font-medium">Nhóm phân hệ</th>
              {ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center font-medium">
                  {ROLE_META[r].short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERM_MODULES.map((mod) => (
              <React.Fragment key={mod.id}>
                <tr className="border-t border-[var(--color-border-light)]">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                      className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]"
                    >
                      {expandedModule === mod.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {mod.label}
                    </button>
                  </td>
                  {ROLES.map((r) => {
                    const locked = r === "super";
                    const on = hasAny(r, mod.id);
                    return (
                      <td key={r} className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => toggleModule(r, mod.id, mod.actions)}
                          disabled={locked}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            on ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]",
                            locked && "opacity-70"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              on ? "translate-x-4" : "translate-x-0.5"
                            )}
                          />
                          {locked && (
                            <Lock size={9} className="absolute -right-4 text-[var(--color-text-lighter)]" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
                {expandedModule === mod.id && (
                  <tr className="bg-[var(--color-page-bg)]">
                    <td colSpan={ROLES.length + 1} className="px-6 py-3">
                      <div className="flex flex-col gap-2">
                        {ROLES.map((r) => (
                          <div key={r} className="flex items-center gap-3 text-[12px]">
                            <span className="w-24 shrink-0 font-medium text-[var(--color-text-secondary)]">
                              {ROLE_META[r].short}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {mod.actions.map((a) => {
                                const checked = matrix[r][mod.id]?.includes(a) ?? false;
                                return (
                                  <button
                                    key={a}
                                    onClick={() => toggleAction(r, mod.id, a)}
                                    disabled={r === "super"}
                                    className={cn(
                                      "rounded-[20px] border px-2.5 py-1 text-[11.5px]",
                                      checked
                                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                        : "border-[var(--color-border)] bg-white text-[var(--color-text-muted)]",
                                      r === "super" && "opacity-70"
                                    )}
                                  >
                                    {ACTION_LABEL[a] ?? a}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
