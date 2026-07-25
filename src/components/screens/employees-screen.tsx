"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, Download, Plus, ChevronRight, ChevronLeft, Info, Loader2, Phone, Mail, Briefcase, MapPin } from "lucide-react";
import { fetchEmployees, fetchDepartments, importEmployees, type ApiEmployee, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, formatMoney, seededRandom } from "@/lib/utils";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportStyledExcel } from "@/lib/excel-export";
import { getEmployeePhoto } from "@/lib/photo-store";
import { parseCsvObjects } from "@/lib/csv";
import { X, CheckCircle2, FileDown, Settings2, Trash2, Lock, Unlock, MoreVertical, GripVertical, ArrowDownAZ, ArrowUpAZ, Pencil } from "lucide-react";
import {
  getCustomFields,
  addCustomField,
  removeCustomField,
  getCustomValue,
  hydrateCustomData,
  type CustomField,
  type CustomFieldType,
} from "@/lib/custom-fields";

function CustomFieldsModal({
  fields,
  onClose,
  onChanged,
}: {
  fields: CustomField[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");

  const [busy, setBusy] = useState(false);

  async function add() {
    if (!label.trim() || busy) return;
    setBusy(true);
    try {
      await addCustomField({
        label: label.trim(),
        type,
        options: type === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      });
      setLabel("");
      setOptions("");
      setType("text");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[480px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Cột tùy chỉnh</div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Form thêm cột luôn ở trên cùng để không bị danh sách đẩy xuống */}
        <div className="rounded-[10px] bg-[var(--color-page-bg)] p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">Thêm cột mới</div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Tên cột"
              className="h-8 flex-1 min-w-[140px] rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className="h-8 rounded-[6px] border border-[var(--color-border)] bg-white px-2 text-[12.5px] outline-none"
            >
              <option value="text">Văn bản</option>
              <option value="number">Số</option>
              <option value="select">Lựa chọn</option>
            </select>
            <button
              onClick={add}
              disabled={!label.trim() || busy}
              className="flex h-8 items-center gap-1.5 rounded-[6px] bg-[var(--color-accent)] px-3 text-[12.5px] font-medium text-white disabled:opacity-60"
            >
              <Plus size={13} /> Thêm
            </button>
          </div>
          {type === "select" && (
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Các lựa chọn, phân cách bằng dấu phẩy (VD: A, B, C)"
              className="mt-2 h-8 w-full rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
            />
          )}
        </div>

        {/* Danh sách cột đã tạo (cuộn riêng, không đẩy form) */}
        <div className="mt-3 flex max-h-[240px] flex-col gap-1 overflow-y-auto">
          {fields.length === 0 ? (
            <div className="rounded-[8px] bg-[var(--color-page-bg)] px-3 py-2.5 text-[12.5px] text-[var(--color-text-muted)]">
              Chưa có cột tùy chỉnh. Thêm cột riêng của bạn phía trên (VD: Tay nghề, Ca làm việc, Ghi chú HR).
            </div>
          ) : (
            <>
              <div className="px-1 text-[11px] text-[var(--color-text-lighter)]">
                {fields.length} cột đã tạo · Xoá cột ở menu <span className="font-medium">Cột</span> trên bảng.
              </div>
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-[8px] border border-[var(--color-border-light)] px-3 py-2">
                  <div className="text-[12.5px]">
                    <span className="font-medium text-[var(--color-text-primary)]">{f.label}</span>
                    <span className="ml-2 text-[11px] text-[var(--color-text-lighter)]">
                      {f.type === "text" ? "Văn bản" : f.type === "number" ? "Số" : "Lựa chọn"}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await removeCustomField(f.id);
                      onChanged();
                    }}
                    className="text-[var(--color-text-lighter)] hover:text-[var(--color-danger)]"
                    title="Xóa cột"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

// Map Vietnamese column headers → employee field keys used by the API.
const IMPORT_HEADER_MAP: Record<string, string> = {
  "mã thẻ": "code",
  "mã nv": "code",
  "họ và tên": "name",
  "họ tên": "name",
  "bộ phận": "department_name",
  "phòng ban": "department_name",
  "chức vụ": "position",
  "điện thoại": "phone",
  "sđt": "phone",
  email: "email",
  "giới tính": "gender",
  "ngày sinh": "dob",
  cccd: "cccd",
  "địa chỉ": "address",
  "ngày vào làm": "join_date",
  "nơi làm việc": "workplace",
  "cấp bậc": "level",
  "quản lý": "manager",
  "loại hợp đồng": "contract_type",
  "trạng thái": "status",
  "ngân hàng": "bank",
  "tài khoản ngân hàng": "bank",
  "mã số thuế": "tax_code",
};

const IMPORT_TEMPLATE_HEADERS = [
  "Mã thẻ", "Họ và tên", "Bộ phận", "Chức vụ", "Điện thoại", "Email",
  "Giới tính", "Ngày sinh", "CCCD", "Địa chỉ", "Ngày vào làm",
  "Nơi làm việc", "Cấp bậc", "Quản lý", "Loại hợp đồng", "Trạng thái",
  "Tài khoản ngân hàng", "Mã số thuế",
];

function mapImportRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = IMPORT_HEADER_MAP[header.trim().toLowerCase()];
    if (key) out[key] = value;
  }
  return out;
}

function downloadImportTemplate() {
  const example = [
    "9001", "Nguyễn Văn Mẫu", "Phay CNC", "Công nhân", "0900000000", "mau@tienhuy.vn",
    "Nam", "1995-05-20", "079095000000", "Quận 12, TP.HCM", "2026-01-15",
    "Nhà xưởng", "Bậc 1", "Nguyễn Văn Thiện", "Xác định thời hạn", "Đang làm việc",
    "Vietcombank - 0000000000", "0000000000",
  ];
  const csv = "﻿" + [IMPORT_TEMPLATE_HEADERS.join(","), example.join(",")].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-import-nhan-vien.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ColumnHeaderMenu({
  label,
  value,
  onFilter,
  onSort,
  onRename,
  onClear,
  sortDir,
}: {
  label: string;
  value: string;
  onFilter: (v: string) => void;
  onSort: (dir: "asc" | "desc") => void;
  onRename: (label: string) => void;
  onClear: () => void;
  sortDir: "asc" | "desc" | null;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState(label);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
      setRenaming(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const active = value.trim().length > 0 || sortDir !== null;

  const item = "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]";

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const width = 210;
          setPos({
            top: rect.bottom + 4,
            left: Math.min(rect.left, window.innerWidth - width - 12),
          });
          setOpen((o) => !o);
          setRenameText(label);
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-border-light)]",
          active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]",
        )}
        title={`Tùy chọn cột ${label}`}
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 w-[210px] rounded-[10px] border border-[var(--color-border)] bg-white p-1.5 shadow-lg normal-case tracking-normal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-1 pb-1.5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">Lọc dữ liệu</div>
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={value}
                onChange={(e) => onFilter(e.target.value)}
                placeholder="Nhập để lọc..."
                className="h-8 w-full rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          <button className={item} onClick={() => onSort("asc")}>
            <ArrowDownAZ size={14} className={cn(sortDir === "asc" && "text-[var(--color-accent)]")} /> Sắp xếp A → Z
          </button>
          <button className={item} onClick={() => onSort("desc")}>
            <ArrowUpAZ size={14} className={cn(sortDir === "desc" && "text-[var(--color-accent)]")} /> Sắp xếp Z → A
          </button>
          {renaming ? (
            <div className="flex items-center gap-1 px-1 py-1">
              <input
                autoFocus
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(renameText);
                    setRenaming(false);
                  }
                }}
                className="h-8 w-full rounded-[6px] border border-[var(--color-accent)] px-2 text-[12.5px] outline-none"
              />
              <button
                onClick={() => {
                  onRename(renameText);
                  setRenaming(false);
                }}
                className="rounded-[6px] bg-[var(--color-success)] px-2 py-1 text-[11px] font-medium text-white"
              >
                Lưu
              </button>
            </div>
          ) : (
            <button className={item} onClick={() => setRenaming(true)}>
              <Pencil size={14} /> Đổi tên cột
            </button>
          )}
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          <button
            className={cn(item, !active && "opacity-50")}
            disabled={!active}
            onClick={onClear}
          >
            <X size={14} /> Xóa lọc & sắp xếp
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ id, name, photoUrl, className }: { id: number; name: string; photoUrl?: string | null; className?: string }) {
  const photo = getEmployeePhoto(id) ?? photoUrl;
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] font-semibold text-white", className)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function EmployeeHoverCard({ employee, anchorRect }: { employee: ApiEmployee; anchorRect: DOMRect }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ch = card.offsetHeight;
    const cw = card.offsetWidth;
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;
    if (top + ch > window.innerHeight) top = anchorRect.top - ch - 8;
    if (left + cw > window.innerWidth) left = window.innerWidth - cw - 12;
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [anchorRect]);

  const kpiScore = seededRandom(employee.name + "kpi", 65, 98);
  const kpiRank = kpiScore >= 90 ? "Tốt" : kpiScore >= 70 ? "Khá" : kpiScore >= 50 ? "TB" : "Yếu";
  const active = employee.status === "Đang làm việc";

  return (
    <div
      ref={cardRef}
      className="fixed z-[100] w-[300px] rounded-[12px] border border-[var(--color-border)] bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center gap-3 border-b border-[var(--color-border-light)] p-3.5">
        <Avatar id={employee.id} name={employee.name} photoUrl={employee.photo_url} className="h-12 w-12 flex-shrink-0 text-[14px]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{employee.name}</div>
          <div className="text-[11.5px] text-[var(--color-text-muted)]">
            {employee.position ?? "Nhân viên"} · {employee.department_name ?? "-"}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-text-lighter)]">{employee.code}</span>
            <span className={cn("rounded-[20px] px-1.5 py-0.5 text-[10px] font-medium", active ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]")}>
              {employee.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3.5 text-[12px]">
        {employee.phone && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Phone size={13} className="flex-shrink-0 text-[var(--color-text-lighter)]" />
            <span>{employee.phone}</span>
          </div>
        )}
        {employee.email && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Mail size={13} className="flex-shrink-0 text-[var(--color-text-lighter)]" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        {employee.workplace && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <MapPin size={13} className="flex-shrink-0 text-[var(--color-text-lighter)]" />
            <span>{employee.workplace}</span>
          </div>
        )}
        {employee.join_date && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Briefcase size={13} className="flex-shrink-0 text-[var(--color-text-lighter)]" />
            <span>Vào làm: {formatDate(employee.join_date)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border-light)] px-3.5 py-2.5">
        <div className="text-[11px] text-[var(--color-text-lighter)]">KPI tháng 06</div>
        <div className="flex items-center gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[15px] font-bold text-[var(--color-accent)]">{kpiScore}</span>
          <span className={cn("text-[11px] font-semibold", kpiScore >= 70 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]")}>{kpiRank}</span>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const { mutate: doImport, isLoading } = useMutation((data: Record<string, unknown>[]) => importEmployees(data));

  const invalid = rows.filter((r) => !r.code || !r.name).length;
  const valid = rows.length - invalid;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const objs = parseCsvObjects(String(reader.result));
        const mapped = objs.map(mapImportRow);
        if (mapped.length === 0) {
          setError("Không đọc được dòng dữ liệu nào. Kiểm tra lại file (cần dòng tiêu đề + dữ liệu).");
          setRows([]);
          return;
        }
        setRows(mapped);
      } catch {
        setError("File không hợp lệ. Vui lòng dùng file CSV (UTF-8).");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const payload = rows.filter((r) => r.code && r.name);
    if (payload.length === 0) return;
    try {
      const res = await doImport(payload);
      setResult({ created: res.created, updated: res.updated });
      onImported();
    } catch {
      setError("Nhập dữ liệu thất bại. Vui lòng thử lại.");
    }
  }

  const previewCols = ["code", "name", "department_name", "position", "phone"];
  const previewLabels = ["Mã thẻ", "Họ và tên", "Bộ phận", "Chức vụ", "Điện thoại"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-[720px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Import nhân viên từ Excel/CSV</div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={40} className="text-[var(--color-success)]" />
            <div className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Đã nhập xong: {result.created} thêm mới, {result.updated} cập nhật
            </div>
            <button
              onClick={onClose}
              className="mt-2 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between rounded-[10px] bg-[var(--color-page-bg)] px-3 py-2.5 text-[12.5px] text-[var(--color-text-muted)]">
              <span>Chưa có file mẫu? Tải về, điền dữ liệu rồi lưu dạng CSV.</span>
              <button onClick={downloadImportTemplate} className="flex items-center gap-1.5 font-medium text-[var(--color-accent)] hover:underline">
                <FileDown size={14} /> Tải file mẫu
              </button>
            </div>

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--color-border)] px-4 py-6 text-[12.5px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              <Upload size={16} />
              {fileName || "Chọn file CSV để tải lên"}
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            </label>

            {error && (
              <div className="mt-3 rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">{error}</div>
            )}

            {rows.length > 0 && (
              <>
                <div className="mt-3 flex items-center gap-3 text-[12.5px]">
                  <span className="text-[var(--color-text-muted)]">Đọc được <b className="text-[var(--color-text-primary)]">{rows.length}</b> dòng · hợp lệ <b className="text-[var(--color-success)]">{valid}</b>{invalid > 0 && <> · thiếu mã/tên <b className="text-[var(--color-danger)]">{invalid}</b></>}</span>
                </div>
                <div className="mt-2 max-h-[280px] overflow-auto rounded-[10px] border border-[var(--color-border-light)]">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[var(--color-page-bg)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                      <tr>{previewLabels.map((l) => <th key={l} className="px-2.5 py-2 font-medium">{l}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className={cn("border-t border-[var(--color-border-light)]", (!r.code || !r.name) && "bg-[var(--color-danger-bg)]")}>
                          {previewCols.map((c) => <td key={c} className="px-2.5 py-1.5 text-[var(--color-text-secondary)]">{r[c] || "-"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]">Huỷ</button>
              <button
                onClick={handleImport}
                disabled={valid === 0 || isLoading}
                className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isLoading ? "Đang nhập..." : `Nhập ${valid} nhân viên`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export function EmployeesScreen({ onNavigate }: { onNavigate: (screen: string, id?: string) => void }) {
  const { role } = useAuth();
  const canEdit = role === "super" || role === "hr";
  const isLeadOrStaff = role === "lead" || role === "staff";

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [page, setPage] = useState(1);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [hoveredEmployee, setHoveredEmployee] = useState<ApiEmployee | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deptFetcher = useCallback(() => fetchDepartments(), []);
  const { data: deptData } = useQuery(deptFetcher);

  const departments = useMemo(() => {
    if (!deptData?.data) return [];
    return deptData.data.map((d: ApiDepartment) => d.name);
  }, [deptData]);

  // Fetch the full list once; search, department, per-column filters, sorting
  // and pagination are all applied client-side so per-column filters work
  // across every row (not just the current page).
  const employeeFetcher = useCallback(() => fetchEmployees({ page: 1, pageSize: 1000 }), []);
  const { data: empData, isLoading, refetch } = useQuery(employeeFetcher, []);
  const allItems = useMemo(() => empData?.data ?? [], [empData]);

  const [importOpen, setImportOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>(() => getCustomFields());
  useEffect(() => {
    hydrateCustomData(true).then(() => setCustomFields(getCustomFields()));
  }, []);

  const colFilterKey = JSON.stringify(colFilters);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page on filter change
    setPage(1);
  }, [search, dept, colFilterKey]);

  const columns: ColumnDef<ApiEmployee>[] = [
    {
      id: "code",
      label: "Mã thẻ",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => e.code,
      exportValue: (e) => e.code,
    },
    {
      id: "name",
      label: "Họ và tên",
      locked: true,
      cell: (e) => (
        <div
          className="flex items-center gap-2.5"
          onMouseEnter={(ev) => {
            const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
            hoverTimer.current = setTimeout(() => {
              setHoveredEmployee(e);
              setHoverRect(rect);
            }, 350);
          }}
          onMouseLeave={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            setHoveredEmployee(null);
            setHoverRect(null);
          }}
        >
          <Avatar id={e.id} name={e.name} photoUrl={e.photo_url} className="h-8 w-8 text-[11px]" />
          <span className="font-medium text-[var(--color-text-primary)]">{e.name}</span>
        </div>
      ),
      exportValue: (e) => e.name,
    },
    {
      id: "department_name",
      label: "Bộ phận",
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.department_name ?? "-",
      exportValue: (e) => e.department_name ?? "",
    },
    {
      id: "position",
      label: "Chức vụ",
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.position ?? "-",
      exportValue: (e) => e.position ?? "",
    },
    {
      id: "phone",
      label: "Điện thoại",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => e.phone ?? "-",
      exportValue: (e) => e.phone ?? "",
    },
    {
      id: "email",
      label: "Email",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.email ?? "-",
      exportValue: (e) => e.email ?? "",
    },
    {
      id: "gender",
      label: "Giới tính",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.gender ?? "-",
      exportValue: (e) => e.gender ?? "",
    },
    {
      id: "join_date",
      label: "Ngày vào làm",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => formatDate(e.join_date),
      exportValue: (e) => formatDate(e.join_date),
    },
    {
      id: "workplace",
      label: "Nơi làm việc",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.workplace ?? "-",
      exportValue: (e) => e.workplace ?? "",
    },
    {
      id: "level",
      label: "Cấp bậc",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.level ?? "-",
      exportValue: (e) => e.level ?? "",
    },
    {
      id: "manager",
      label: "Quản lý",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.manager ?? "-",
      exportValue: (e) => e.manager ?? "",
    },
    {
      id: "contract_type",
      label: "Loại HĐ",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.contract_type ?? "-",
      exportValue: (e) => e.contract_type ?? "",
    },
    {
      id: "contract_end",
      label: "Ngày hết hạn HĐ",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => formatDate(e.contract_end),
      exportValue: (e) => formatDate(e.contract_end),
    },
    {
      id: "dob",
      label: "Ngày sinh",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => formatDate(e.dob),
      exportValue: (e) => formatDate(e.dob),
    },
    {
      id: "cccd",
      label: "CCCD",
      defaultHidden: true,
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => e.cccd ?? "-",
      exportValue: (e) => e.cccd ?? "",
    },
    {
      id: "tax_code",
      label: "Mã số thuế",
      defaultHidden: true,
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => e.tax_code ?? "-",
      exportValue: (e) => e.tax_code ?? "",
    },
    {
      id: "address",
      label: "Địa chỉ",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.address ?? "-",
      exportValue: (e) => e.address ?? "",
    },
    {
      id: "bank",
      label: "Tài khoản ngân hàng",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.bank ?? "-",
      exportValue: (e) => e.bank ?? "",
    },
    {
      id: "dependents",
      label: "Số phụ thuộc",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => e.dependents ?? 0,
      exportValue: (e) => e.dependents ?? 0,
      exportFormat: "int",
    },
    {
      id: "base_salary",
      label: "Lương cơ bản",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => (e.base_salary ? formatMoney(e.base_salary) : "-"),
      exportValue: (e) => e.base_salary ?? 0,
      exportFormat: "money",
    },
    {
      id: "allowance",
      label: "Phụ cấp",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => (e.allowance ? formatMoney(e.allowance) : "-"),
      exportValue: (e) => e.allowance ?? 0,
      exportFormat: "money",
    },
    {
      id: "ins_status",
      label: "Tình trạng BHXH",
      defaultHidden: true,
      cellClass: "text-[var(--color-text-muted)]",
      cell: (e) => e.ins_status ?? "-",
      exportValue: (e) => e.ins_status ?? "",
    },
    {
      id: "ins_salary_base",
      label: "Mức lương đóng BH",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => (e.ins_salary_base ? formatMoney(e.ins_salary_base) : "-"),
      exportValue: (e) => e.ins_salary_base ?? 0,
      exportFormat: "money",
    },
    {
      id: "status",
      label: "Trạng thái",
      cell: (e) => (
        <span
          className={cn(
            "rounded-[20px] px-2 py-0.5 text-[11px] font-medium",
            e.status === "Đang làm việc"
              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]",
          )}
        >
          {e.status}
        </span>
      ),
      exportValue: (e) => e.status,
    },
    {
      id: "actions",
      label: "",
      locked: true,
      noReorder: true,
      align: "right",
      cell: () => <ChevronRight size={15} className="text-[var(--color-text-lighter)]" />,
    },
  ];

  const customColumns: ColumnDef<ApiEmployee>[] = customFields.map((f) => ({
    id: f.id,
    label: f.label,
    cellClass: "text-[var(--color-text-muted)]",
    cell: (e) => getCustomValue(e.id, f.id) || "-",
    exportValue: (e) => getCustomValue(e.id, f.id),
    exportFormat: f.type === "number" ? "int" : "text",
  }));

  // Insert custom columns just before the trailing actions column.
  const actionsIdx = columns.findIndex((c) => c.id === "actions");
  const displayColumns =
    actionsIdx >= 0
      ? [...columns.slice(0, actionsIdx), ...customColumns, ...columns.slice(actionsIdx)]
      : [...columns, ...customColumns];

  const { hidden, toggle, reset, visibleColumns, reorderLocked, toggleReorderLock, moveColumn, renameColumn, widths, setColumnWidth } =
    useColumnPrefs("employees", displayColumns);

  const [sortState, setSortState] = useState<{ colId: string; dir: "asc" | "desc" } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Drag the divider on a header's right edge to resize that column.
  function startResize(colId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLElement | null;
    const startX = e.clientX;
    const startW = th ? th.getBoundingClientRect().width : widths[colId] ?? 150;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(60, Math.min(600, startW + (ev.clientX - startX)));
      setColumnWidth(colId, w);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Double-click the divider → auto-fit the left column to its widest content.
  function autoFitColumn(colId: string) {
    const root = tableRef.current;
    if (!root) return;
    const cells = root.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(colId)}"]`);
    let max = 0;
    cells.forEach((el) => {
      const inner = el.firstElementChild as HTMLElement | null;
      max = Math.max(max, inner ? inner.scrollWidth : el.scrollWidth);
    });
    if (max > 0) setColumnWidth(colId, Math.max(60, Math.min(600, max + 28)));
  }

  function colWidth(c: ColumnDef<ApiEmployee>): number {
    if (widths[c.id]) return widths[c.id];
    if (c.id === "name") return 220;
    if (c.id === "code") return 96;
    if (c.id === "actions") return 48;
    if (c.id === "status") return 130;
    if (c.id === "email" || c.id === "address") return 200;
    return 150;
  }

  // Apply search + department + per-column filters + sort, then paginate — all client-side.
  const filtered = useMemo(() => {
    let list = allItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e: ApiEmployee) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q),
      );
    }
    if (dept !== "all") {
      list = list.filter((e: ApiEmployee) => e.department_name === dept);
    }
    for (const [colId, text] of Object.entries(colFilters)) {
      if (!text.trim()) continue;
      const col = displayColumns.find((c) => c.id === colId);
      if (!col?.exportValue) continue;
      const q = text.toLowerCase();
      list = list.filter((e: ApiEmployee, i: number) =>
        String(col.exportValue!(e, i)).toLowerCase().includes(q),
      );
    }
    if (sortState) {
      const col = displayColumns.find((c) => c.id === sortState.colId);
      if (col?.exportValue) {
        const dir = sortState.dir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const va = col.exportValue!(a, 0);
          const vb = col.exportValue!(b, 0);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb), "vi") * dir;
        });
      }
    }
    return list;
  }, [allItems, search, dept, colFilters, displayColumns, sortState]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );

  const [exporting, setExporting] = useState(false);
  const EMPTY_NEW = { code: "", name: "", department_name: "", position: "", phone: "", status: "Đang làm việc" };
  const [adding, setAdding] = useState(false);
  const [newEmp, setNewEmp] = useState(EMPTY_NEW);
  const [addSaving, setAddSaving] = useState(false);

  async function saveNewEmployee() {
    if (!newEmp.code.trim() || !newEmp.name.trim()) return;
    setAddSaving(true);
    try {
      await importEmployees([{ ...newEmp }]);
      setAdding(false);
      setNewEmp(EMPTY_NEW);
      setPage(1);
      refetch();
    } finally {
      setAddSaving(false);
    }
  }

  async function handleExport() {
    const cols = visibleColumns.filter((c) => c.exportValue && c.id !== "actions");
    setExporting(true);
    try {
      // Export the current filtered set (all matching rows), grouped by department.
      const sorted = [...filtered].sort(
        (a: ApiEmployee, b: ApiEmployee) =>
          (a.department_name ?? "").localeCompare(b.department_name ?? "", "vi") ||
          a.code.localeCompare(b.code, "vi"),
      );
      await exportStyledExcel({
        filename: `nhan-vien-${new Date().toISOString().slice(0, 10)}`,
        title: "DANH SÁCH NHÂN VIÊN",
        meta: [
          dept === "all" ? "Bộ phận: Tất cả" : `Bộ phận: ${dept}`,
          `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`,
          `Số lượng: ${sorted.length} nhân viên`,
        ],
        columns: cols.map((c) => ({ label: c.label, align: c.align, format: c.exportFormat })),
        rows: sorted.map((e: ApiEmployee, i: number) => cols.map((c) => c.exportValue!(e, i))),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setPage(1);
            refetch();
          }}
        />
      )}
      {fieldsOpen && (
        <CustomFieldsModal
          fields={customFields}
          onClose={() => setFieldsOpen(false)}
          onChanged={() => hydrateCustomData(true).then(() => setCustomFields(getCustomFields()))}
        />
      )}
      {isLeadOrStaff && (
        <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-2.5 text-[12.5px] text-[var(--color-warning)]">
          <Info size={15} />
          Bạn đang xem ở chế độ chỉ đọc. Liên hệ HR để chỉnh sửa thông tin nhân viên.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã thẻ..."
            className="h-9 w-full rounded-[8px] border border-[var(--color-border)] pl-8 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="h-9 rounded-[8px] border border-[var(--color-border)] px-2.5 text-[13px] text-[var(--color-text-secondary)] outline-none"
        >
          <option value="all">Tất cả bộ phận</option>
          {departments.map((d: string) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <ColumnMenu
            columns={displayColumns}
            hidden={hidden}
            onToggle={toggle}
            onReset={reset}
            isDeletable={(c) => c.id.startsWith("cf_")}
            onDeleteColumn={async (id) => {
              await removeCustomField(id);
              await hydrateCustomData(true);
              setCustomFields(getCustomFields());
            }}
          />
          <button
            onClick={toggleReorderLock}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12.5px] transition-colors",
              reorderLocked
                ? "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                : "border-[var(--color-accent)] bg-[var(--color-accent)] text-white",
            )}
            title={
              reorderLocked
                ? "Mở khoá để kéo đổi vị trí và chỉnh rộng cột"
                : "Đang mở khoá — kéo grip để đổi vị trí, kéo vạch phải để chỉnh rộng, nháy đúp vạch để tự canh. Bấm để khoá & lưu lại"
            }
          >
            {reorderLocked ? <Lock size={14} /> : <Unlock size={14} />}
            {reorderLocked ? "Khoá cột" : "Đang chỉnh cột · Lưu"}
          </button>
          {canEdit && (
            <button
              onClick={() => setFieldsOpen(true)}
              className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
              title="Quản lý cột tùy chỉnh"
            >
              <Settings2 size={14} /> Cột tùy chỉnh
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)] disabled:opacity-60"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
              >
                <Upload size={14} /> Import
              </button>
              <button
                onClick={() => {
                  setAdding(true);
                  setPage(1);
                }}
                className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                <Plus size={14} /> Thêm mới
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2 text-[13px]">Đang tải dữ liệu...</span>
          </div>
        ) : (
          <table ref={tableRef} className="w-full min-w-[900px] table-fixed text-[13px]">
            <colgroup>
              <col style={{ width: 52 }} />
              {visibleColumns.map((c) => (
                <col key={c.id} style={{ width: colWidth(c) }} />
              ))}
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                {/* Fixed STT column — always first, never reordered */}
                <th className="px-4 py-3 text-center font-medium">STT</th>
                {visibleColumns.map((c) => {
                  const canDrag = !reorderLocked && !c.noReorder;
                  const canMenu = !!c.exportValue && !c.noReorder;
                  const canResize = !reorderLocked && !c.noReorder;
                  return (
                    <th
                      key={c.id}
                      data-col={c.id}
                      onDragOver={(e) => {
                        if (!reorderLocked && !c.noReorder) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        if (reorderLocked || c.noReorder) return;
                        e.preventDefault();
                        const dragId = e.dataTransfer.getData("text/plain");
                        if (dragId) moveColumn(dragId, c.id);
                      }}
                      className={cn(
                        "relative border-l border-[var(--color-border-light)] px-3 py-3 font-medium",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                      )}
                    >
                      <span className={cn("flex min-w-0 items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                        {canDrag && (
                          <span
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                            className="flex-shrink-0 cursor-grab text-[var(--color-text-lighter)] hover:text-[var(--color-accent)] active:cursor-grabbing"
                            title="Kéo để đổi vị trí cột"
                          >
                            <GripVertical size={13} />
                          </span>
                        )}
                        <span className="truncate">{c.label}</span>
                        {canMenu && (
                          <span className="flex-shrink-0">
                            <ColumnHeaderMenu
                              label={c.label}
                              value={colFilters[c.id] ?? ""}
                              sortDir={sortState?.colId === c.id ? sortState.dir : null}
                              onFilter={(v) => setColFilters((s) => ({ ...s, [c.id]: v }))}
                              onSort={(dir) => setSortState({ colId: c.id, dir })}
                              onRename={(label) => renameColumn(c.id, label)}
                              onClear={() => {
                                setColFilters((s) => ({ ...s, [c.id]: "" }));
                                setSortState((s) => (s?.colId === c.id ? null : s));
                              }}
                            />
                          </span>
                        )}
                      </span>
                      {canResize && (
                        <span
                          onMouseDown={(e) => startResize(c.id, e)}
                          onDoubleClick={() => autoFitColumn(c.id)}
                          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-[var(--color-accent)]/40"
                          title="Kéo để chỉnh rộng cột · Nháy đúp để tự canh theo nội dung"
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {adding && (
                <tr className="border-t border-[var(--color-accent)] bg-[var(--color-page-bg)]">
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <input
                        autoFocus
                        value={newEmp.code}
                        onChange={(e) => setNewEmp((s) => ({ ...s, code: e.target.value }))}
                        placeholder="Mã thẻ *"
                        className="h-8 w-[90px] rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      />
                      <input
                        value={newEmp.name}
                        onChange={(e) => setNewEmp((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Họ và tên *"
                        className="h-8 w-[170px] rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      />
                      <select
                        value={newEmp.department_name}
                        onChange={(e) => setNewEmp((s) => ({ ...s, department_name: e.target.value }))}
                        className="h-8 w-[150px] rounded-[6px] border border-[var(--color-border)] bg-white px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      >
                        <option value="">-- Bộ phận --</option>
                        {departments.map((d: string) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        value={newEmp.position}
                        onChange={(e) => setNewEmp((s) => ({ ...s, position: e.target.value }))}
                        placeholder="Chức vụ"
                        className="h-8 w-[140px] rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      />
                      <input
                        value={newEmp.phone}
                        onChange={(e) => setNewEmp((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="Điện thoại"
                        className="h-8 w-[120px] rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      />
                      <select
                        value={newEmp.status}
                        onChange={(e) => setNewEmp((s) => ({ ...s, status: e.target.value }))}
                        className="h-8 w-[130px] rounded-[6px] border border-[var(--color-border)] bg-white px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
                      >
                        {["Đang làm việc", "Thử việc", "Nghỉ thai sản", "Nghỉ việc"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={saveNewEmployee}
                        disabled={addSaving || !newEmp.code.trim() || !newEmp.name.trim()}
                        className="flex h-8 items-center gap-1.5 rounded-[6px] bg-[var(--color-success)] px-3 text-[12.5px] font-medium text-white disabled:opacity-60"
                      >
                        {addSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Lưu
                      </button>
                      <button
                        onClick={() => {
                          setAdding(false);
                          setNewEmp(EMPTY_NEW);
                        }}
                        className="flex h-8 items-center rounded-[6px] border border-[var(--color-border)] px-3 text-[12.5px] text-[var(--color-text-secondary)]"
                      >
                        Huỷ
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {items.map((e: ApiEmployee, i: number) => (
                <tr
                  key={e.id}
                  onClick={() => onNavigate("employee-detail", String(e.id))}
                  className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                >
                  <td className="px-4 py-2.5 text-center font-[family-name:var(--font-mono)] text-[var(--color-text-lighter)]">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      data-col={c.id}
                      className={cn(
                        "overflow-hidden border-l border-[var(--color-border-light)] px-3 py-2.5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.cellClass,
                      )}
                    >
                      <div className={cn("min-w-0 truncate", c.align === "center" && "mx-auto")}>{c.cell(e, i)}</div>
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {hoveredEmployee && hoverRect && (
        <EmployeeHoverCard employee={hoveredEmployee} anchorRect={hoverRect} />
      )}

      <div className="flex items-center justify-between text-[12.5px] text-[var(--color-text-muted)]">
        <div>
          Hiển thị {items.length} / {filtered.length} nhân viên
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "h-8 w-8 rounded-[8px] text-[12.5px]",
                p === page ? "bg-[var(--color-accent)] text-white" : "border border-[var(--color-border)]"
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
