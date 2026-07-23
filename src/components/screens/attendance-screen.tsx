"use client";

import { useMemo, useState } from "react";
import { Pencil, Check, X, RotateCcw, Lock, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAttendance, updateAttendance, type ApiAttendance } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { type ColumnDef } from "@/lib/table-prefs";
import { DataTable } from "@/components/ui/data-table";
import { exportStyledExcel } from "@/lib/excel-export";

type Flag = "all" | "hasLeave" | "mismatch" | "edited";
type AttRow = { row: ApiAttendance; mismatch: boolean };

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AttendanceScreen() {
  const [period, setPeriod] = useState(currentPeriod);
  const [flag, setFlag] = useState<Flag>("all");
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ actual: number; ot: number }>({ actual: 0, ot: 0 });
  const [saving, setSaving] = useState(false);

  const { data: attData, isLoading, refetch } = useQuery(
    () => fetchAttendance(period),
    [period],
  );
  const rows = useMemo<AttRow[]>(() => {
    if (!attData?.data) return [];
    return attData.data.map((row) => {
      const mismatch =
        row.actual_days !== row.std_days - row.pn - row.pb - row.vr - row.kp;
      return { row, mismatch };
    });
  }, [attData]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        return (
          flag === "all" ||
          (flag === "hasLeave" && r.row.pn + r.row.pb + r.row.vr + r.row.kp > 0) ||
          (flag === "mismatch" && r.mismatch) ||
          (flag === "edited" && r.row.is_edited === 1)
        );
      }),
    [rows, flag],
  );

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

  const columns = useMemo<ColumnDef<AttRow>[]>(() => {
    const num = (v: number) => (v ? v : "-");
    return [
      { id: "code", label: "Mã thẻ", cell: (d) => <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{d.row.employee_code}</span>, exportValue: (d) => d.row.employee_code },
      { id: "name", label: "Họ và tên", locked: true, cell: (d) => <span className="font-medium text-[var(--color-text-primary)]">{d.row.employee_name}</span>, exportValue: (d) => d.row.employee_name },
      { id: "std_days", label: "Công chuẩn", align: "right", cell: (d) => <span className="font-[family-name:var(--font-mono)]">{d.row.std_days}</span>, exportValue: (d) => d.row.std_days, exportFormat: "int" },
      {
        id: "actual_days",
        label: "Công thực",
        align: "right",
        cell: (d) =>
          editingRow === d.row.id ? (
            <input
              type="number"
              value={draft.actual}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraft((s) => ({ ...s, actual: Number(e.target.value) }))}
              className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
            />
          ) : (
            <span className="font-[family-name:var(--font-mono)]">{d.row.actual_days}</span>
          ),
        exportValue: (d) => d.row.actual_days,
        exportFormat: "int",
      },
      { id: "pn", label: "PN", align: "right", cell: (d) => <span className="font-[family-name:var(--font-mono)]">{num(d.row.pn)}</span>, exportValue: (d) => d.row.pn, exportFormat: "int" },
      { id: "pb", label: "PB", align: "right", cell: (d) => <span className="font-[family-name:var(--font-mono)]">{num(d.row.pb)}</span>, exportValue: (d) => d.row.pb, exportFormat: "int" },
      { id: "vr", label: "VR", align: "right", cell: (d) => <span className="font-[family-name:var(--font-mono)]">{num(d.row.vr)}</span>, exportValue: (d) => d.row.vr, exportFormat: "int" },
      { id: "kp", label: "KP", align: "right", cell: (d) => <span className="font-[family-name:var(--font-mono)]">{num(d.row.kp)}</span>, exportValue: (d) => d.row.kp, exportFormat: "int" },
      {
        id: "overtime_hours",
        label: "Tăng ca (h)",
        align: "right",
        cell: (d) =>
          editingRow === d.row.id ? (
            <input
              type="number"
              value={draft.ot}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraft((s) => ({ ...s, ot: Number(e.target.value) }))}
              className="w-14 rounded-[6px] border border-[var(--color-border)] px-1 py-0.5 text-right"
            />
          ) : (
            <span className="font-[family-name:var(--font-mono)]">{d.row.overtime_hours}</span>
          ),
        exportValue: (d) => d.row.overtime_hours,
        exportFormat: "int",
      },
      {
        id: "actions",
        label: "",
        align: "right",
        noReorder: true,
        cell: (d) => {
          const editing = editingRow === d.row.id;
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {editing ? (
                <>
                  <button
                    onClick={() => saveEdit(d.row.id)}
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
                    onClick={() => startEdit(d.row)}
                    className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                  >
                    <Pencil size={12} />
                  </button>
                  {d.row.is_edited === 1 && (
                    <button
                      onClick={() => refetch()}
                      className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRow, draft, saving]);

  async function handleExport(exportRows: AttRow[], exportCols: ColumnDef<AttRow>[]) {
    const cols = exportCols.filter((c) => c.exportValue);
    await exportStyledExcel({
      filename: `cham-cong-${period}`,
      title: `BẢNG CHẤM CÔNG KỲ ${periodDisplay}`,
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${exportRows.length} nhân viên`],
      columns: cols.map((c) => ({ label: c.label, align: c.align, format: c.exportFormat })),
      rows: exportRows.map((r, i) => cols.map((c) => c.exportValue!(r, i))),
    });
  }

  const flagButtons = (
    <div className="flex flex-wrap items-center gap-1">
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
              : "border-[var(--color-border)] text-[var(--color-text-muted)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[var(--color-accent)]" />
        </div>
      ) : (
        <DataTable<AttRow>
          tableKey="attendance"
          columns={columns}
          rows={filtered}
          getRowKey={(d) => d.row.id}
          minWidth={1000}
          rowClassName={(d) => (d.mismatch && editingRow !== d.row.id ? "bg-[var(--color-warning-bg)]" : "")}
          emptyText="Không có dữ liệu chấm công."
          toolbarLeft={flagButtons}
          toolbarActions={({ rows: fr, columns: fc }) => (
            <button
              onClick={() => handleExport(fr, fc)}
              className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
            >
              <Download size={14} /> Xuất Excel
            </button>
          )}
        />
      )}
    </div>
  );
}
