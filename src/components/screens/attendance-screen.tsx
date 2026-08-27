"use client";

import { useMemo, useRef, useState } from "react";
import { Pencil, X, RotateCcw, Lock, Loader2, Download, Upload, CalendarClock, CalendarPlus, CheckCircle2, Stethoscope } from "lucide-react";
import { AttendanceEditModal } from "@/components/screens/attendance-edit-modal";
import { OvertimeDayGridModal } from "@/components/screens/overtime-day-grid-modal";
import { cn, formatDate } from "@/lib/utils";
import {
  fetchAttendance,
  updateAttendance,
  fetchAttendancePeriods,
  importAttendance,
  fetchLeaveSuggestions,
  applyLeaveToAttendance,
  fetchCheckupSuggestions,
  applyCheckupToAttendance,
  type ApiAttendance,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import { type ColumnDef } from "@/lib/table-prefs";
import { DataTable } from "@/components/ui/data-table";
import { useCustomColumns } from "@/lib/use-custom-columns";
import { exportStyledExcel } from "@/lib/excel-export";
import { parseAttendanceWorkbook, type ParsedAttendance } from "@/lib/attendance-import";

type Flag = "all" | "hasLeave" | "mismatch" | "edited";
type AttRow = { row: ApiAttendance; mismatch: boolean };

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const n0 = (v: number | undefined | null) => (v ? v : "-");
const money = (v: number | undefined | null) => (v ? Math.round(v).toLocaleString("vi-VN") : "-");

const LEAVE_TYPE_LABEL: Record<string, string> = {
  PN: "Phép năm", PB: "Phép bệnh", VR: "Việc riêng", PC: "Phép cưới", PT: "Phép tang", TNLD: "Tai nạn LĐ",
};

export function AttendanceScreen() {
  const { user } = useAuth();
  const canSync = user?.role === "super" || user?.role === "hr";
  const [userPeriod, setUserPeriod] = useState<string | null>(null);
  const [flag, setFlag] = useState<Flag>("all");
  const [editRow, setEditRow] = useState<ApiAttendance | null>(null);
  const [otRow, setOtRow] = useState<ApiAttendance | null>(null);
  const [applying, setApplying] = useState<number | "all" | null>(null);

  // Kỳ mặc định = tháng gần nhất có dữ liệu (nếu chưa có → tháng hiện tại).
  // Dẫn xuất (không dùng effect): khi user chưa chọn thì lấy kỳ mới nhất từ API.
  const { data: periodsData, refetch: refetchPeriods } = useQuery(fetchAttendancePeriods, []);
  const period = userPeriod ?? periodsData?.data?.[0] ?? (periodsData ? currentPeriod() : "");
  const setPeriod = setUserPeriod;

  const { data: attData, isLoading, refetch } = useQuery(
    () => (period ? fetchAttendance(period) : Promise.resolve({ data: [], period: "" })),
    [period],
  );

  // Đơn nghỉ đã duyệt trong kỳ, chờ HR áp vào bảng chấm công (chỉ HR/super).
  const { data: sugData, refetch: refetchSuggestions } = useQuery(
    canSync && period ? () => fetchLeaveSuggestions(period) : null,
    [canSync, period],
  );
  const suggestions = sugData?.data ?? [];

  async function applyOne(id: number) {
    setApplying(id);
    try {
      await applyLeaveToAttendance(id);
    } finally {
      setApplying(null);
      refetch();
      refetchSuggestions();
    }
  }

  async function applyAll() {
    setApplying("all");
    try {
      for (const s of suggestions) {
        if (s.attendance_id && !s.attendance_locked) await applyLeaveToAttendance(s.id);
      }
    } finally {
      setApplying(null);
      refetch();
      refetchSuggestions();
    }
  }

  // Lần khám thai trong kỳ chờ áp vào cột PTS (chỉ HR/super).
  const { data: chkData, refetch: refetchCheckups } = useQuery(
    canSync && period ? () => fetchCheckupSuggestions(period) : null,
    [canSync, period],
  );
  const checkups = chkData?.data ?? [];

  async function applyCheckupOne(id: number) {
    setApplying(-id); // dùng id âm để phân biệt với đơn nghỉ
    try {
      await applyCheckupToAttendance(id);
    } finally {
      setApplying(null);
      refetch();
      refetchCheckups();
    }
  }

  async function applyCheckupAll() {
    setApplying("all");
    try {
      for (const c of checkups) {
        if (c.attendance_id && !c.attendance_locked) await applyCheckupToAttendance(c.id);
      }
    } finally {
      setApplying(null);
      refetch();
      refetchCheckups();
    }
  }

  const rows = useMemo<AttRow[]>(() => {
    if (!attData?.data) return [];
    return attData.data.map((row) => ({
      row,
      mismatch: row.actual_days !== row.std_days - row.pn - row.pb - row.vr - row.kp,
    }));
  }, [attData]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          flag === "all" ||
          (flag === "hasLeave" && r.row.pn + r.row.pb + r.row.vr + r.row.kp > 0) ||
          (flag === "mismatch" && r.mismatch) ||
          (flag === "edited" && r.row.is_edited === 1),
      ),
    [rows, flag],
  );

  async function saveEdit(id: number, payload: Record<string, number | string>) {
    await updateAttendance(id, payload);
    setEditRow(null);
    refetch();
  }

  // ---- Import Excel ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedAttendance | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; unmatched: string[] } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    try {
      const parsed = await parseAttendanceWorkbook(await f.arrayBuffer(), period);
      setImportResult(null);
      setPreview(parsed);
    } catch (err) {
      alert("Không đọc được file: " + (err as Error).message);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await importAttendance(preview.period, preview.rows);
      setImportResult({ imported: res.imported, unmatched: res.unmatched ?? [] });
      setPeriod(preview.period);
      refetchPeriods();
      refetch();
    } catch (err) {
      alert("Nhập thất bại: " + (err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const periodDisplay = period ? `${period.split("-")[1]}/${period.split("-")[0]}` : "";
  const lockedRow = attData?.data?.find((r) => r.locked === 1);

  const columns = useMemo<ColumnDef<AttRow>[]>(() => {
    const mono = (v: React.ReactNode) => <span className="font-[family-name:var(--font-mono)]">{v}</span>;
    return [
      { id: "code", label: "Mã thẻ", cell: (d) => <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{d.row.employee_code}</span>, exportValue: (d) => d.row.employee_code },
      { id: "name", label: "Họ và tên", locked: true, cell: (d) => <span className="font-medium text-[var(--color-text-primary)]">{d.row.employee_name}</span>, exportValue: (d) => d.row.employee_name },
      { id: "std_days", label: "Công chuẩn", align: "right", cell: (d) => mono(d.row.std_days), exportValue: (d) => d.row.std_days, exportFormat: "int" },
      { id: "actual_days", label: "Tổng N.C", align: "right", cell: (d) => mono(d.row.actual_days), exportValue: (d) => d.row.actual_days },
      { id: "pn", label: "PN", align: "right", cell: (d) => mono(n0(d.row.pn)), exportValue: (d) => d.row.pn },
      { id: "pb", label: "PB", align: "right", cell: (d) => mono(n0(d.row.pb)), exportValue: (d) => d.row.pb },
      { id: "vr", label: "VR", align: "right", cell: (d) => mono(n0(d.row.vr)), exportValue: (d) => d.row.vr },
      { id: "kp", label: "KP", align: "right", cell: (d) => mono(n0(d.row.kp)), exportValue: (d) => d.row.kp },
      { id: "pc", label: "PC", align: "right", cell: (d) => mono(n0(d.row.pc)), exportValue: (d) => d.row.pc ?? 0 },
      { id: "pt", label: "PT", align: "right", cell: (d) => mono(n0(d.row.pt)), exportValue: (d) => d.row.pt ?? 0 },
      { id: "tnld", label: "TNLĐ", align: "right", cell: (d) => mono(n0(d.row.tnld)), exportValue: (d) => d.row.tnld ?? 0 },
      { id: "pts", label: "PTS", align: "right", cell: (d) => mono(n0(d.row.pts)), exportValue: (d) => d.row.pts ?? 0 },
      { id: "gas_days", label: "Xăng xe (ngày)", align: "right", cell: (d) => mono(n0(d.row.gas_days)), exportValue: (d) => d.row.gas_days ?? 0 },
      { id: "ot_weekday_hours", label: "OT NT (h)", align: "right", cell: (d) => mono(n0(d.row.ot_weekday_hours)), exportValue: (d) => d.row.ot_weekday_hours ?? 0 },
      { id: "ot_sunday_hours", label: "OT CN (h)", align: "right", cell: (d) => mono(n0(d.row.ot_sunday_hours)), exportValue: (d) => d.row.ot_sunday_hours ?? 0 },
      { id: "ot_holiday_hours", label: "OT Lễ (h)", align: "right", cell: (d) => mono(n0(d.row.ot_holiday_hours)), exportValue: (d) => d.row.ot_holiday_hours ?? 0 },
      { id: "meal_allowance", label: "Tiền cơm TC", align: "right", cell: (d) => mono(money(d.row.meal_allowance)), exportValue: (d) => d.row.meal_allowance ?? 0, exportFormat: "money" },
    ];
  }, []);

  // Cột thao tác cố định ngoài cùng bên trái (trước STT) để dễ bấm khi cuộn ngang.
  const actionsColumn = useMemo<ColumnDef<AttRow>>(
    () => ({
      id: "actions",
      label: "",
      noReorder: true,
      cell: (d) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOtRow(d.row)}
            title="Tăng ca theo ngày"
            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
          >
            <CalendarClock size={12} />
          </button>
          <button
            onClick={() => setEditRow(d.row)}
            disabled={d.row.locked === 1}
            title={d.row.locked === 1 ? "Kỳ đã chốt — không sửa được" : "Điều chỉnh chấm công"}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)] disabled:opacity-40"
          >
            <Pencil size={12} />
          </button>
          {d.row.is_edited === 1 && (
            <span title="Đã điều chỉnh thủ công" className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--color-accent)]">
              <RotateCcw size={12} />
            </span>
          )}
        </div>
      ),
    }),
    [],
  );

  // Cột tùy chỉnh dùng chung (đồng bộ theo nhân viên) — thêm vào cuối bảng.
  const { customColumns, addColumn, deleteColumn, isCustomColumn } = useCustomColumns<AttRow>((d) => d.row.employee_id);
  const displayColumns = [...columns, ...customColumns];

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
      {([["all", "Tất cả"], ["hasLeave", "Có nghỉ"], ["mismatch", "Lệch công"], ["edited", "Đã sửa"]] as [Flag, string][]).map(([key, label]) => (
        <button key={key} onClick={() => setFlag(key)} className={cn("rounded-[20px] border px-3 py-1.5 text-[12px] font-medium", flag === key ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] text-[var(--color-text-muted)]")}>
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
            <><Lock size={14} className="text-[var(--color-success)]" /> Kỳ {periodDisplay} — Đã chốt bởi HR</>
          ) : (
            <>Kỳ {periodDisplay} — Chưa chốt</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] text-[var(--color-text-muted)]">Kỳ công:</label>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]" />
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          <button onClick={() => fileRef.current?.click()} disabled={parsing} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60">
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nhập Excel
          </button>
        </div>
      </div>

      {canSync && suggestions.length > 0 && (
        <div className="rounded-[14px] border border-[var(--color-accent)] bg-[var(--color-accent)]/[0.04] p-[14px]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-accent)]">
              <CalendarPlus size={16} /> Đơn nghỉ đã duyệt chờ áp vào chấm công ({suggestions.length})
            </div>
            <button
              onClick={applyAll}
              disabled={applying !== null || !suggestions.some((s) => s.attendance_id && !s.attendance_locked)}
              className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {applying === "all" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Áp dụng tất cả
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => {
              const noRow = !s.attendance_id;
              const locked = !!s.attendance_locked;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--color-text-primary)]">{s.employee_name}</span>
                    <span className="text-[var(--color-text-muted)]"> · {s.employee_code} · </span>
                    <span className="font-medium text-[var(--color-accent)]">{LEAVE_TYPE_LABEL[s.type_code] ?? s.type_code}</span>
                    <span className="text-[var(--color-text-muted)]"> {s.days} ngày · {formatDate(s.from_date)}{s.to_date && s.to_date !== s.from_date ? `–${formatDate(s.to_date)}` : ""}</span>
                  </div>
                  {noRow ? (
                    <span className="text-[11.5px] text-[var(--color-warning)]">Chưa có dòng chấm công kỳ này</span>
                  ) : locked ? (
                    <span className="text-[11.5px] text-[var(--color-text-lighter)]">Kỳ đã khoá</span>
                  ) : (
                    <button
                      onClick={() => applyOne(s.id)}
                      disabled={applying !== null}
                      className="flex items-center gap-1 rounded-[6px] border border-[var(--color-accent)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-50"
                    >
                      {applying === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Áp dụng
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canSync && checkups.length > 0 && (
        <div className="rounded-[14px] border border-[var(--color-maternity)] bg-[var(--color-maternity-bg)] p-[14px]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-maternity)]">
              <Stethoscope size={16} /> Ngày khám thai chờ áp vào chấm công — cột PTS ({checkups.length})
            </div>
            <button
              onClick={applyCheckupAll}
              disabled={applying !== null || !checkups.some((c) => c.attendance_id && !c.attendance_locked)}
              className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-maternity)] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {applying === "all" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Áp dụng tất cả
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {checkups.map((c) => {
              const noRow = !c.attendance_id;
              const locked = !!c.attendance_locked;
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-white px-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--color-text-primary)]">{c.employee_name}</span>
                    <span className="text-[var(--color-text-muted)]"> · {c.employee_code} · Khám thai lần {c.seq} · </span>
                    <span className="text-[var(--color-text-muted)]">{c.days} ngày · {formatDate(c.checkup_date)}</span>
                  </div>
                  {noRow ? (
                    <span className="text-[11.5px] text-[var(--color-warning)]">Chưa có dòng chấm công kỳ này</span>
                  ) : locked ? (
                    <span className="text-[11.5px] text-[var(--color-text-lighter)]">Kỳ đã khoá</span>
                  ) : (
                    <button
                      onClick={() => applyCheckupOne(c.id)}
                      disabled={applying !== null}
                      className="flex items-center gap-1 rounded-[6px] border border-[var(--color-maternity)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--color-maternity)] hover:bg-[var(--color-maternity)] hover:text-white disabled:opacity-50"
                    >
                      {applying === -c.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Áp dụng
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[var(--color-accent)]" /></div>
      ) : (
        <DataTable<AttRow>
          tableKey="attendance"
          columns={displayColumns}
          leadingColumn={actionsColumn}
          leadingWidth={92}
          onAddColumn={(_after, opts) => addColumn(opts)}
          isColumnDeletable={(c) => isCustomColumn(c.id)}
          onDeleteColumn={(id) => {
            if (confirm("Xoá cột tùy chỉnh này khỏi toàn bộ hệ thống? Dữ liệu của cột sẽ mất.")) deleteColumn(id);
          }}
          rows={filtered}
          getRowKey={(d) => d.row.id}
          minWidth={1400}
          pageSize={15}
          rowClassName={(d) => (d.mismatch ? "bg-[var(--color-warning-bg)]" : "")}
          emptyText={`Chưa có dữ liệu chấm công kỳ ${periodDisplay}. Bấm “Nhập Excel” để tải bảng chấm công lên.`}
          toolbarLeft={flagButtons}
          toolbarActions={({ rows: fr, columns: fc }) => (
            <button onClick={() => handleExport(fr, fc)} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
              <Download size={14} /> Xuất Excel
            </button>
          )}
        />
      )}

      {editRow && (
        <AttendanceEditModal
          row={editRow}
          onSave={saveEdit}
          onClose={() => setEditRow(null)}
        />
      )}

      {otRow && (
        <OvertimeDayGridModal
          row={otRow}
          onSaved={() => {
            setOtRow(null);
            refetch();
          }}
          onClose={() => setOtRow(null)}
        />
      )}

      {preview && (
        <ImportPreviewModal
          preview={preview}
          importing={importing}
          result={importResult}
          onPeriodChange={(p) => setPreview((s) => (s ? { ...s, period: p } : s))}
          onConfirm={confirmImport}
          onClose={() => {
            setPreview(null);
            setImportResult(null);
          }}
        />
      )}
    </div>
  );
}

function ImportPreviewModal({
  preview,
  importing,
  result,
  onPeriodChange,
  onConfirm,
  onClose,
}: {
  preview: ParsedAttendance;
  importing: boolean;
  result: { imported: number; unmatched: string[] } | null;
  onPeriodChange: (p: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-8 w-full max-w-[720px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Nhập bảng chấm công từ Excel</div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
        </div>

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] bg-[var(--color-success-bg,#e8f5e9)] px-4 py-3 text-[13px] text-[var(--color-success)]">
              ✓ Đã nhập <b>{result.imported}</b> nhân viên vào kỳ <b>{preview.period.split("-")[1]}/{preview.period.split("-")[0]}</b>.
            </div>
            {result.unmatched.length > 0 && (
              <div className="rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-3 text-[12.5px] text-[var(--color-warning)]">
                <div className="mb-1 font-medium">{result.unmatched.length} tên không khớp nhân viên (bỏ qua):</div>
                <div className="max-h-32 overflow-y-auto leading-relaxed">{result.unmatched.join(", ")}</div>
                <div className="mt-1 text-[11px]">Kiểm tra lại tên trong hồ sơ nhân viên cho khớp với file rồi nhập lại.</div>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white">Xong</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-[var(--color-page-bg)] px-3 py-2.5 text-[12.5px]">
              <span className="text-[var(--color-text-muted)]">Đọc được <b className="text-[var(--color-text-primary)]">{preview.rows.length}</b> nhân viên.</span>
              <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                Kỳ:
                <input type="month" value={preview.period} onChange={(e) => onPeriodChange(e.target.value)} className="h-7 rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none" />
              </span>
            </div>
            {preview.warnings.length > 0 && (
              <div className="rounded-[8px] bg-[var(--color-warning-bg)] px-3 py-2 text-[12px] text-[var(--color-warning)]">{preview.warnings.join(" · ")}</div>
            )}
            <div className="max-h-[320px] overflow-auto rounded-[8px] border border-[var(--color-border-light)]">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-[var(--color-page-bg)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                  <tr>
                    <th className="px-2.5 py-2 font-medium">Họ và tên</th>
                    <th className="px-2.5 py-2 text-right font-medium">Tổng N.C</th>
                    <th className="px-2.5 py-2 text-right font-medium">Xăng (ngày)</th>
                    <th className="px-2.5 py-2 text-right font-medium">OT NT</th>
                    <th className="px-2.5 py-2 text-right font-medium">OT CN</th>
                    <th className="px-2.5 py-2 text-right font-medium">Tiền cơm</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 60).map((r, i) => (
                    <tr key={i} className="border-t border-[var(--color-border-light)]">
                      <td className="px-2.5 py-1.5">{r.name}</td>
                      <td className="px-2.5 py-1.5 text-right font-[family-name:var(--font-mono)]">{r.actualDays}</td>
                      <td className="px-2.5 py-1.5 text-right font-[family-name:var(--font-mono)]">{r.gasDays}</td>
                      <td className="px-2.5 py-1.5 text-right font-[family-name:var(--font-mono)]">{r.otWeekdayHours || "-"}</td>
                      <td className="px-2.5 py-1.5 text-right font-[family-name:var(--font-mono)]">{r.otSundayHours || "-"}</td>
                      <td className="px-2.5 py-1.5 text-right font-[family-name:var(--font-mono)]">{r.mealAllowance ? Math.round(r.mealAllowance).toLocaleString("vi-VN") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 60 && <div className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">… và {preview.rows.length - 60} dòng nữa</div>}
            </div>
            <div className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              PN/PB/VR (nghỉ phép) không có trong file này nên được giữ nguyên theo dữ liệu HR; KP tự tính = Công chuẩn − N.C − PN − PB − VR. Nhập lại cùng kỳ sẽ ghi đè số liệu chấm công/tăng ca cũ.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]">Huỷ</button>
              <button onClick={onConfirm} disabled={importing || preview.rows.length === 0} className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Nhập {preview.rows.length} dòng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
