"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Check, X, RotateCcw, Lock } from "lucide-react";
import { employees } from "@/lib/data/employees";
import { hashName, cn } from "@/lib/utils";

const STD_DAYS = 26;
type Flag = "all" | "hasLeave" | "mismatch" | "edited";

function buildAttendance(name: string) {
  const h = hashName(name);
  const leaves = h % 6 === 0 ? 1 + (h % 3) : h % 9 === 0 ? 2 : 0;
  const actual = STD_DAYS - leaves - (h % 11 === 0 ? 1 : 0);
  const pn = leaves > 0 ? Math.min(leaves, 1 + (h % 2)) : 0;
  const pb = leaves > pn ? leaves - pn : 0;
  const vr = h % 13 === 0 ? 1 : 0;
  const kp = h % 17 === 0 ? 1 : 0;
  const ot = h % 8;
  return { std: STD_DAYS, actual, pn, pb, vr, kp, ot };
}

export function AttendanceScreen() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [flag, setFlag] = useState<Flag>("all");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { actual: number; ot: number }>>({});
  const [draft, setDraft] = useState<{ actual: number; ot: number }>({ actual: 0, ot: 0 });

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(e.department));
    return Array.from(set);
  }, []);

  const rows = useMemo(() => {
    return employees.map((e, idx: number) => {
      const key = e.code ?? String(idx);
      const base = buildAttendance(e.name ?? key);
      const data = overrides[key] ? { ...base, ...overrides[key] } : base;
      const mismatch = data.actual !== data.std - data.pn - data.pb - data.vr - data.kp;
      return { key, e, data, mismatch, edited: !!overrides[key] };
    });
  }, [overrides]);

  const filtered = rows.filter((r) => {
    const matchSearch = !search || (r.e.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === "all" || r.e.department === dept;
    const matchFlag =
      flag === "all" ||
      (flag === "hasLeave" && (r.data.pn + r.data.pb + r.data.vr + r.data.kp) > 0) ||
      (flag === "mismatch" && r.mismatch) ||
      (flag === "edited" && r.edited);
    return matchSearch && matchDept && matchFlag;
  });

  function startEdit(key: string, data: { actual: number; ot: number }) {
    setEditingRow(key);
    setDraft({ actual: data.actual, ot: data.ot });
  }

  function saveEdit(key: string) {
    setOverrides((s) => ({ ...s, [key]: draft }));
    setEditingRow(null);
  }

  function restoreEdit(key: string) {
    setOverrides((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    setEditingRow(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
          <Lock size={14} className="text-[var(--color-success)]" />
          Kỳ 06/2026 — Đã chốt bởi HR · Chữ ký số: đã xác nhận
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="h-9 w-full rounded-[8px] border border-[var(--color-border)] pl-8 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="h-9 rounded-[8px] border border-[var(--color-border)] px-2.5 text-[13px] text-[var(--color-text-secondary)] outline-none"
        >
          <option value="all">Tất cả bộ phận</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {(
            [
              ["all", "Tất cả"],
              ["hasLeave", "Có nghỉ"],
              ["mismatch", "Lệch công"],
              ["edited", "Đã sửa"],
            ] as [Flag, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFlag(key)}
              className={cn(
                "rounded-[20px] border px-3 py-1.5 text-[12px] font-medium",
                flag === key
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-[1000px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-3 py-3 font-medium">STT</th>
              <th className="px-3 py-3 font-medium">Mã thẻ</th>
              <th className="px-3 py-3 font-medium">Họ và tên</th>
              <th className="px-3 py-3 font-medium">Bộ phận</th>
              <th className="px-3 py-3 text-right font-medium">Công chuẩn</th>
              <th className="px-3 py-3 text-right font-medium">Công thực</th>
              <th className="px-3 py-3 text-right font-medium">PN</th>
              <th className="px-3 py-3 text-right font-medium">PB</th>
              <th className="px-3 py-3 text-right font-medium">VR</th>
              <th className="px-3 py-3 text-right font-medium">KP</th>
              <th className="px-3 py-3 text-right font-medium">Tăng ca (h)</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const editing = editingRow === r.key;
              return (
                <tr
                  key={r.key}
                  className={cn(
                    "border-t border-[var(--color-border-light)]",
                    r.mismatch && !editing && "bg-[var(--color-warning-bg)]"
                  )}
                >
                  <td className="px-3 py-2 text-[var(--color-text-light)]">{i + 1}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                    {r.e.code}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{r.e.name}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">{r.e.department}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.data.std}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                    {editing ? (
                      <input
                        type="number"
                        value={draft.actual}
                        onChange={(e) => setDraft((d) => ({ ...d, actual: Number(e.target.value) }))}
                        className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
                      />
                    ) : (
                      r.data.actual
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.data.pn || "-"}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.data.pb || "-"}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.data.vr || "-"}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.data.kp || "-"}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                    {editing ? (
                      <input
                        type="number"
                        value={draft.ot}
                        onChange={(e) => setDraft((d) => ({ ...d, ot: Number(e.target.value) }))}
                        className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
                      />
                    ) : (
                      r.data.ot
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {editing ? (
                        <>
                          <button
                            onClick={() => saveEdit(r.key)}
                            className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--color-success)] text-white"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingRow(null)}
                            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)]"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r.key, r.data)}
                            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                          >
                            <Pencil size={12} />
                          </button>
                          {r.edited && (
                            <button
                              onClick={() => restoreEdit(r.key)}
                              className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
