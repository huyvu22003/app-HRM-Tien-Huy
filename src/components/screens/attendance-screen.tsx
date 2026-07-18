"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Check, X, RotateCcw, Lock, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAttendance, updateAttendance, type ApiAttendance } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportStyledExcel } from "@/lib/excel-export";

type Flag = "all" | "hasLeave" | "mismatch" | "edited";

const ATT_COLUMNS: ColumnDef<ApiAttendance>[] = [
  { id: "stt", label: "STT", cell: () => "", exportValue: (_r, i) => i + 1 },
  { id: "code", label: "Mã thẻ", cell: (r) => r.employee_code, exportValue: (r) => r.employee_code },
  { id: "name", label: "Họ và tên", locked: true, cell: (r) => r.employee_name, exportValue: (r) => r.employee_name },
  { id: "std_days", label: "Công chuẩn", align: "right", cell: (r) => r.std_days, exportValue: (r) => r.std_days },
  { id: "actual_days", label: "Công thực", align: "right", cell: (r) => r.actual_days, exportValue: (r) => r.actual_days },
  { id: "pn", label: "PN", align: "right", cell: (r) => r.pn, exportValue: (r) => r.pn },
  { id: "pb", label: "PB", align: "right", cell: (r) => r.pb, exportValue: (r) => r.pb },
  { id: "vr", label: "VR", align: "right", cell: (r) => r.vr, exportValue: (r) => r.vr },
  { id: "kp", label: "KP", align: "right", cell: (r) => r.kp, exportValue: (r) => r.kp },
  { id: "overtime_hours", label: "Tăng ca (h)", align: "right", cell: (r) => r.overtime_hours, exportValue: (r) => r.overtime_hours },
];

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AttendanceScreen() {
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState("");
  const [flag, setFlag] = useState<Flag>("all");
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ actual: number; ot: number }>({ actual: 0, ot: 0 });
  const [saving, setSaving] = useState(false);

  const { data: attData, isLoading, refetch } = useQuery(
    () => fetchAttendance(period),
    [period],
  );
  const rows = useMemo(() => {
    if (!attData?.data) return [];
    return attData.data.map((row) => {
      const mismatch =
        row.actual_days !== row.std_days - row.pn - row.pb - row.vr - row.kp;
      return { row, mismatch };
    });
  }, [attData]);

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.row.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.row.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchFlag =
      flag === "all" ||
      (flag === "hasLeave" && r.row.pn + r.row.pb + r.row.vr + r.row.kp > 0) ||
      (flag === "mismatch" && r.mismatch) ||
      (flag === "edited" && r.row.is_edited === 1);
    return matchSearch && matchFlag;
  });

  function startEdit(row: ApiAttendance) {
    setEditingRow(row.id);
    setDraft({ actual: row.actual_days, ot: row.overtime_hours });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      await updateAttendance(id, {
        actualDays: draft.actual,
        overtimeHours: draft.ot,
      });
      refetch();
    } finally {
      setSaving(false);
      setEditingRow(null);
    }
  }

  const periodDisplay = period
    ? `${period.split("-")[1]}/${period.split("-")[0]}`
    : "";

  const lockedRow = attData?.data?.find((r) => r.locked === 1);

  const { hidden, toggle, reset, isVisible } = useColumnPrefs("attendance", ATT_COLUMNS);

  async function handleExport() {
    const cols = ATT_COLUMNS.filter((c) => isVisible(c.id) && c.exportValue);
    await exportStyledExcel({
      filename: `cham-cong-${period}`,
      title: `BẢNG CHẤM CÔNG KỲ ${periodDisplay}`,
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${filtered.length} nhân viên`],
      columns: cols.map((c) => ({ label: c.label, align: c.align, format: c.exportFormat })),
      rows: filtered.map((r, i) => cols.map((c) => c.exportValue!(r.row, i)))
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
          {lockedRow ? (
            <>
              <Lock size={14} className="text-[var(--color-success)]" />
              Kỳ {periodDisplay} — Đã chốt bởi HR
            </>
          ) : (
            <>Kỳ {periodDisplay} — Chưa chốt</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] text-[var(--color-text-muted)]">Kỳ công:</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
          />
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
        <div className="ml-auto flex gap-2">
          <ColumnMenu columns={ATT_COLUMNS} hidden={hidden} onToggle={toggle} onReset={reset} />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
          >
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[var(--color-accent)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
          <table className="w-full min-w-[1000px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                {isVisible("stt") && <th className="px-3 py-3 font-medium">STT</th>}
                {isVisible("code") && <th className="px-3 py-3 font-medium">Mã thẻ</th>}
                {isVisible("name") && <th className="px-3 py-3 font-medium">Họ và tên</th>}
                {isVisible("std_days") && <th className="px-3 py-3 text-right font-medium">Công chuẩn</th>}
                {isVisible("actual_days") && <th className="px-3 py-3 text-right font-medium">Công thực</th>}
                {isVisible("pn") && <th className="px-3 py-3 text-right font-medium">PN</th>}
                {isVisible("pb") && <th className="px-3 py-3 text-right font-medium">PB</th>}
                {isVisible("vr") && <th className="px-3 py-3 text-right font-medium">VR</th>}
                {isVisible("kp") && <th className="px-3 py-3 text-right font-medium">KP</th>}
                {isVisible("overtime_hours") && <th className="px-3 py-3 text-right font-medium">Tăng ca (h)</th>}
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const editing = editingRow === r.row.id;
                return (
                  <tr
                    key={r.row.id}
                    className={cn(
                      "border-t border-[var(--color-border-light)]",
                      r.mismatch && !editing && "bg-[var(--color-warning-bg)]"
                    )}
                  >
                    {isVisible("stt") && <td className="px-3 py-2 text-[var(--color-text-light)]">{i + 1}</td>}
                    {isVisible("code") && (
                      <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                        {r.row.employee_code}
                      </td>
                    )}
                    {isVisible("name") && (
                      <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{r.row.employee_name}</td>
                    )}
                    {isVisible("std_days") && (
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.row.std_days}</td>
                    )}
                    {isVisible("actual_days") && (
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                        {editing ? (
                          <input
                            type="number"
                            value={draft.actual}
                            onChange={(e) => setDraft((d) => ({ ...d, actual: Number(e.target.value) }))}
                            className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
                          />
                        ) : (
                          r.row.actual_days
                        )}
                      </td>
                    )}
                    {isVisible("pn") && <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.row.pn || "-"}</td>}
                    {isVisible("pb") && <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.row.pb || "-"}</td>}
                    {isVisible("vr") && <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.row.vr || "-"}</td>}
                    {isVisible("kp") && <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{r.row.kp || "-"}</td>}
                    {isVisible("overtime_hours") && (
                      <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                        {editing ? (
                          <input
                            type="number"
                            value={draft.ot}
                            onChange={(e) => setDraft((d) => ({ ...d, ot: Number(e.target.value) }))}
                            className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
                          />
                        ) : (
                          r.row.overtime_hours
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <button
                              onClick={() => saveEdit(r.row.id)}
                              disabled={saving}
                              className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--color-success)] text-white"
                            >
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
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
                              onClick={() => startEdit(r.row)}
                              className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                            >
                              <Pencil size={12} />
                            </button>
                            {r.row.is_edited === 1 && (
                              <button
                                onClick={() => {
                                  /* restore handled server-side via refetch */
                                  refetch();
                                }}
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
      )}
    </div>
  );
}
