"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, Download, Plus, ChevronRight, ChevronLeft, Info, Loader2, Phone, Mail, Briefcase, MapPin } from "lucide-react";
import ExcelJS from "exceljs";
import { fetchEmployees, fetchDepartments, importEmployees, deleteEmployee, updateEmployee, type ApiEmployee, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, formatMoney, seededRandom } from "@/lib/utils";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportStyledExcel } from "@/lib/excel-export";
import { getEmployeePhoto } from "@/lib/photo-store";
import { X, CheckCircle2, FileDown, Settings2, Trash2, Lock, Unlock, MoreVertical, GripVertical, ArrowDownAZ, ArrowUpAZ, Pencil, EyeOff, Type, Hash, Calendar } from "lucide-react";
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
              <option value="date">Ngày</option>
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

        {/* Cột đã tạo hiển thị ngay trên bảng. Ẩn/Xóa cột thực hiện ở menu (⋮)
            trên tiêu đề cột — nên không liệt kê lại ở đây để tránh trùng lặp. */}
        <div className="mt-3 rounded-[8px] bg-[var(--color-page-bg)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
          {fields.length === 0 ? (
            <>Chưa có cột tùy chỉnh. Thêm cột riêng của bạn phía trên (VD: Tay nghề, Ca làm việc, Ghi chú HR).</>
          ) : (
            <>
              Đã có <span className="font-medium text-[var(--color-text-secondary)]">{fields.length} cột tùy chỉnh</span> — hiển thị ngay trên bảng danh sách.
              Muốn <b>ẩn</b> hoặc <b>xóa</b> một cột, mở menu <span className="font-medium">(⋮)</span> ở tiêu đề cột đó.
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
  "loại hđ": "contract_type",
  "trạng thái": "status",
  "ngân hàng": "bank",
  "tài khoản ngân hàng": "bank",
  "mã số thuế": "tax_code",
  "số cccd": "cccd",
  "địa chỉ thường trú": "address",
  "ngày nghỉ việc": "resign_date",
  // Phase 2 — hồ sơ mở rộng
  "nguyên nhân nghỉ": "resign_reason",
  "ngày hđlđ l1": "contract_date_1",
  "ngày hđlđ l2": "contract_date_2",
  "ngày hđlđ l3": "contract_date_3",
  "năm sinh": "birth_year",
  "nơi sinh": "birth_place",
  "học lực": "education",
  "địa chỉ tạm trú": "temp_address",
  "ngày cấp": "cccd_issue_date",
  "nơi cấp": "cccd_issue_place",
  "quốc tịch": "nationality",
  "tôn giáo": "religion",
  "dân tộc": "ethnicity",
  "số tài khoản": "bank_account",
  "chi nhánh ngân hàng": "bank_branch",
  "mã số sổ bhxh": "bhxh_no",
  "báo tăng bhxh": "bhxh_increase_date",
  "báo giảm bhxh": "bhxh_decrease_date",
  "npt": "dependents",
  "người thân": "relative_name",
  "mối quan hệ": "relative_relation",
  "số đt người thân": "relative_phone",
  "lương cơ bản": "base_salary",
  "trách nhiệm": "responsibility_salary",
  "pc công việc": "allowance",
  "pc xăng xe": "gas_allowance",
  "chuyên cần": "attendance_bonus",
  "tổng lương": "total_salary", // chỉ để không báo "chưa hỗ trợ" — backend bỏ qua
};

// Nhãn hiển thị cho các trường được đối chiếu.
const FIELD_LABELS: Record<string, string> = {
  code: "Mã thẻ", name: "Họ và tên", department_name: "Bộ phận", position: "Chức vụ",
  phone: "Điện thoại", email: "Email", gender: "Giới tính", dob: "Ngày sinh",
  cccd: "CCCD", address: "Địa chỉ", join_date: "Ngày vào làm", workplace: "Nơi làm việc",
  level: "Cấp bậc", manager: "Quản lý", contract_type: "Loại HĐ", status: "Trạng thái",
  bank: "Tài khoản NH", tax_code: "Mã số thuế", resign_date: "Ngày nghỉ việc",
  resign_reason: "Nguyên nhân nghỉ", contract_date_1: "Ngày HĐLĐ L1", contract_date_2: "Ngày HĐLĐ L2",
  contract_date_3: "Ngày HĐLĐ L3", birth_year: "Năm sinh", birth_place: "Nơi sinh", education: "Học lực",
  temp_address: "Địa chỉ tạm trú", cccd_issue_date: "Ngày cấp CCCD", cccd_issue_place: "Nơi cấp CCCD",
  nationality: "Quốc tịch", religion: "Tôn giáo", ethnicity: "Dân tộc", bank_account: "Số tài khoản",
  bank_branch: "Chi nhánh NH", bhxh_no: "Mã số sổ BHXH", bhxh_increase_date: "Báo tăng BHXH",
  bhxh_decrease_date: "Báo giảm BHXH", relative_name: "Người thân", relative_relation: "Mối quan hệ",
  relative_phone: "SĐT người thân", dependents: "Số phụ thuộc", base_salary: "Lương cơ bản",
  responsibility_salary: "Trách nhiệm", allowance: "PC công việc", gas_allowance: "PC xăng xe",
  attendance_bonus: "Chuyên cần",
};

// Các trường số — chuẩn hoá bỏ dấu phân cách/ký hiệu tiền để so sánh cho khớp.
const NUMERIC_IMPORT_FIELDS = new Set([
  "base_salary", "responsibility_salary", "allowance", "gas_allowance",
  "attendance_bonus", "dependents",
]);

// Các trường được so sánh/cập nhật (khớp với backend import).
const IMPORT_COMPARE_FIELDS = [
  "name", "department_name", "position", "phone", "email", "gender", "dob", "cccd",
  "address", "join_date", "workplace", "level", "manager", "contract_type", "status",
  "bank", "tax_code", "resign_date",
  "resign_reason", "contract_date_1", "contract_date_2", "contract_date_3", "birth_year",
  "birth_place", "education", "temp_address", "cccd_issue_date", "cccd_issue_place",
  "nationality", "religion", "ethnicity", "bank_account", "bank_branch", "bhxh_no",
  "bhxh_increase_date", "bhxh_decrease_date", "relative_name", "relative_relation", "relative_phone",
  // Lương & phụ cấp (upsert vào bảng compensation ở backend)
  "base_salary", "responsibility_salary", "allowance", "gas_allowance", "attendance_bonus", "dependents",
];

// Bộ cột xuất ĐẦY ĐỦ theo mẫu danh sách nhân sự công ty (tiêu đề khớp dữ liệu 1:1).
// Ngày rỗng → để TRỐNG (không xuất "-", tránh khi import lại "-" thành dữ liệu).
const exDate = (v: string | null | undefined) => (v ? formatDate(v) : "");
type FullExportCol = { label: string; value: (e: ApiEmployee) => string | number; align?: "left" | "right" | "center"; format?: "money" | "int" | "text" };
const FULL_EXPORT_COLUMNS: FullExportCol[] = [
  { label: "Mã thẻ", value: (e) => e.code },
  { label: "Họ và tên", value: (e) => e.name },
  { label: "Bộ phận", value: (e) => e.department_name ?? "" },
  { label: "Chức vụ", value: (e) => e.position ?? "" },
  { label: "Điện thoại", value: (e) => e.phone ?? "" },
  { label: "Email", value: (e) => e.email ?? "" },
  { label: "Giới tính", value: (e) => e.gender ?? "" },
  { label: "Ngày vào làm", value: (e) => exDate(e.join_date) },
  { label: "Ngày nghỉ việc", value: (e) => exDate(e.resign_date) },
  { label: "Nguyên nhân nghỉ", value: (e) => e.resign_reason ?? "" },
  { label: "Ngày HĐLĐ L1", value: (e) => exDate(e.contract_date_1) },
  { label: "Loại HĐ", value: (e) => e.contract_type ?? "" },
  { label: "Trạng thái", value: (e) => e.status ?? "" },
  { label: "Ngày HĐLĐ L2", value: (e) => exDate(e.contract_date_2) },
  { label: "Ngày HĐLĐ L3", value: (e) => exDate(e.contract_date_3) },
  { label: "Năm sinh", value: (e) => e.birth_year ?? "" },
  { label: "Nơi sinh", value: (e) => e.birth_place ?? "" },
  { label: "Học lực", value: (e) => e.education ?? "" },
  { label: "Địa chỉ thường trú", value: (e) => e.address ?? "" },
  { label: "Địa chỉ tạm trú", value: (e) => e.temp_address ?? "" },
  { label: "Số CCCD", value: (e) => e.cccd ?? "" },
  { label: "Ngày cấp", value: (e) => exDate(e.cccd_issue_date) },
  { label: "Nơi cấp", value: (e) => e.cccd_issue_place ?? "" },
  { label: "Quốc tịch", value: (e) => e.nationality ?? "" },
  { label: "Tôn giáo", value: (e) => e.religion ?? "" },
  { label: "Dân tộc", value: (e) => e.ethnicity ?? "" },
  { label: "Số tài khoản", value: (e) => e.bank_account ?? "" },
  { label: "Ngân hàng", value: (e) => e.bank ?? "" },
  { label: "Chi nhánh ngân hàng", value: (e) => e.bank_branch ?? "" },
  { label: "Mã số sổ BHXH", value: (e) => e.bhxh_no ?? "" },
  { label: "Báo tăng BHXH", value: (e) => exDate(e.bhxh_increase_date) },
  { label: "Báo giảm BHXH", value: (e) => exDate(e.bhxh_decrease_date) },
  { label: "NPT", value: (e) => e.dependents ?? 0, align: "right", format: "int" },
  { label: "Người thân", value: (e) => e.relative_name ?? "" },
  { label: "Mối quan hệ", value: (e) => e.relative_relation ?? "" },
  { label: "Số ĐT người thân", value: (e) => e.relative_phone ?? "" },
  { label: "Lương cơ bản", value: (e) => e.base_salary ?? 0, align: "right", format: "money" },
  { label: "Trách nhiệm", value: (e) => e.responsibility_salary ?? 0, align: "right", format: "money" },
  { label: "PC công việc", value: (e) => e.allowance ?? 0, align: "right", format: "money" },
  { label: "PC xăng xe", value: (e) => e.gas_allowance ?? 0, align: "right", format: "money" },
  { label: "Chuyên cần", value: (e) => e.attendance_bonus ?? 0, align: "right", format: "money" },
  { label: "Tổng lương", value: (e) => (e.base_salary ?? 0) + (e.responsibility_salary ?? 0) + (e.allowance ?? 0) + (e.gas_allowance ?? 0) + (e.attendance_bonus ?? 0), align: "right", format: "money" },
];

/** Chuẩn hoá ngày dd/mm/yyyy → yyyy-mm-dd để so sánh khỏi lệch định dạng. */
function normalizeImportValue(field: string, value: string): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  // Số: bỏ ký hiệu tiền, dấu chấm/phẩy phân cách và khoảng trắng -> chỉ giữ chữ số.
  // "14.000.000 ₫" / "14,000,000" / "14000000" đều quy về "14000000".
  if (NUMERIC_IMPORT_FIELDS.has(field)) {
    const digits = v.replace(/[^\d-]/g, "");
    return digits === "" || digits === "-" ? "" : String(parseInt(digits, 10));
  }
  if (field === "dob" || field === "join_date" || field === "resign_date") {
    const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const iso = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  return v;
}

const IMPORT_TEMPLATE_HEADERS = [
  "Mã thẻ", "Họ và tên", "Bộ phận", "Chức vụ", "Điện thoại", "Email",
  "Giới tính", "Ngày sinh", "CCCD", "Địa chỉ", "Ngày vào làm",
  "Nơi làm việc", "Cấp bậc", "Quản lý", "Loại hợp đồng", "Trạng thái",
  "Tài khoản ngân hàng", "Mã số thuế",
];

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

// Cột liên quan công thức tính lương & đối chiếu import — KHÔNG cho xóa.
const NON_DELETABLE_COL_IDS = new Set([
  "code", "name", "department_name", "status",
  "dependents", "base_salary", "allowance", "ins_status", "ins_salary_base",
]);

function ColumnHeaderMenu({
  label,
  value,
  onFilter,
  onSort,
  onRename,
  onClear,
  sortDir,
  canRemove,
  isCustom,
  onHide,
  onDelete,
  onAddColumn,
}: {
  label: string;
  value: string;
  onFilter: (v: string) => void;
  onSort: (dir: "asc" | "desc") => void;
  onRename: (label: string) => void;
  onClear: () => void;
  sortDir: "asc" | "desc" | null;
  canRemove: boolean;
  isCustom: boolean;
  onHide: () => void;
  onDelete: () => void;
  /** Thêm cột mới ngay bên phải cột này. */
  onAddColumn?: (opts: { label: string; type: CustomFieldType }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState(label);
  const [adding, setAdding] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<CustomFieldType>("text");
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
      setAdding(false);
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
          {onAddColumn && (
            <>
              <div className="my-1 h-px bg-[var(--color-border-light)]" />
              {adding ? (
                <div className="px-1 py-1">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColName.trim()) {
                        onAddColumn({ label: newColName.trim(), type: newColType });
                        setNewColName("");
                        setAdding(false);
                        setOpen(false);
                      }
                    }}
                    placeholder="Tên cột mới..."
                    className="h-8 w-full rounded-[6px] border border-[var(--color-accent)] px-2 text-[12.5px] outline-none"
                  />
                  <div className="mt-1.5 mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">Định dạng</div>
                  <div className="flex gap-1">
                    {([["text", "Văn bản", Type], ["number", "Số", Hash], ["date", "Ngày", Calendar]] as [CustomFieldType, string, typeof Type][]).map(([val, lbl, Icon]) => {
                      const on = newColType === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setNewColType(val)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-0.5 rounded-[6px] border py-1.5 text-[10.5px]",
                            on
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]",
                          )}
                        >
                          <Icon size={14} /> {lbl}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => {
                        if (!newColName.trim()) return;
                        onAddColumn({ label: newColName.trim(), type: newColType });
                        setNewColName("");
                        setAdding(false);
                        setOpen(false);
                      }}
                      disabled={!newColName.trim()}
                      className="flex-1 rounded-[6px] bg-[var(--color-accent)] px-2 py-1.5 text-[11.5px] font-medium text-white disabled:opacity-50"
                    >
                      Thêm cột bên phải
                    </button>
                    <button
                      onClick={() => { setAdding(false); setNewColName(""); }}
                      className="rounded-[6px] border border-[var(--color-border)] px-2 py-1.5 text-[11.5px] text-[var(--color-text-secondary)]"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                <button className={item} onClick={() => { setAdding(true); setNewColName(""); setNewColType("text"); }}>
                  <Plus size={14} /> Thêm cột
                </button>
              )}
            </>
          )}
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          <button
            className={cn(item, !active && "opacity-50")}
            disabled={!active}
            onClick={onClear}
          >
            <X size={14} /> Xóa lọc & sắp xếp
          </button>
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          {!canRemove ? (
            <div
              className={cn(item, "cursor-not-allowed opacity-50")}
              title="Cột dùng cho công thức/đối chiếu — không thể xóa"
            >
              <Lock size={14} /> Không thể xóa cột
            </div>
          ) : isCustom ? (
            <button
              className={cn(item, "text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]")}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={14} /> Xóa cột (vĩnh viễn)
            </button>
          ) : (
            <button
              className={item}
              onClick={() => {
                setOpen(false);
                onHide();
              }}
              title="Gỡ cột khỏi bảng — dữ liệu không mất, khôi phục lại trong menu “Cột”"
            >
              <EyeOff size={14} /> Ẩn cột khỏi bảng
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ id, name, photoUrl, className }: { id: number; name: string; photoUrl?: string | null; className?: string }) {
  const photo = photoUrl ?? getEmployeePhoto(id);
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

function cellToText(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown;
  if (v == null) return "";
  if (v instanceof Date) {
    return `${String(v.getDate()).padStart(2, "0")}/${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text != null) return String(o.text);
    if (o.result != null) return String(o.result);
    return "";
  }
  return String(v);
}

/** Đọc file .xlsx/.csv, tự tìm dòng tiêu đề ("Mã thẻ"/"Họ và tên"), ánh xạ cột.
 *  Trả về dòng đã map + danh sách cột chưa hỗ trợ (để đánh dấu). */
async function parseImportFile(
  file: File,
): Promise<{ rows: Record<string, string>[]; unsupported: string[] }> {
  let grid: string[][] = [];
  const isXlsx = /\.xlsx$/i.test(file.name);
  if (isXlsx) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    const colCount = ws.columnCount;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const arr: string[] = [];
      for (let c = 1; c <= colCount; c++) arr.push(cellToText(row.getCell(c)));
      grid.push(arr);
    });
  } else {
    const text = await file.text();
    grid = text.split(/\r?\n/).filter((l) => l.length).map((line) => {
      const out: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.replace(/^﻿/, "").trim());
    });
  }

  // Tìm dòng tiêu đề
  const headerIdx = grid.findIndex((r) =>
    r.some((c) => {
      const t = c.trim().toLowerCase();
      return t === "mã thẻ" || t === "mã nv" || t === "họ và tên";
    }),
  );
  if (headerIdx < 0) return { rows: [], unsupported: [] };
  const headers = grid[headerIdx];

  const unsupported = new Set<string>();
  const keyByCol: (string | null)[] = headers.map((h) => {
    const label = h.trim();
    if (!label) return null;
    const key = IMPORT_HEADER_MAP[label.toLowerCase()];
    if (!key) unsupported.add(label);
    return key ?? null;
  });

  const rows: Record<string, string>[] = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const line = grid[r];
    const obj: Record<string, string> = {};
    let any = false;
    line.forEach((val, c) => {
      const key = keyByCol[c];
      const t = val == null ? "" : String(val).trim();
      // Bỏ qua ô rỗng và các ký hiệu placeholder "-", "—", "–".
      if (key && t !== "" && !["-", "—", "–"].includes(t)) {
        obj[key] = normalizeImportValue(key, t);
        any = true;
      }
    });
    if (any) rows.push(obj);
  }
  return { rows, unsupported: [...unsupported] };
}

type ImportStatus = "new" | "update" | "same" | "invalid";
interface ImportRowInfo {
  row: Record<string, string>;
  status: ImportStatus;
  changes: { field: string; old: string; next: string }[];
}

/** Đối chiếu dòng import với nhân viên hiện có (theo Mã thẻ). */
function diffImportRows(rows: Record<string, string>[], existing: ApiEmployee[]): ImportRowInfo[] {
  const byCode = new Map(existing.map((e) => [String(e.code).trim(), e]));
  return rows.map((row) => {
    if (!row.code || !row.name) return { row, status: "invalid" as const, changes: [] };
    const cur = byCode.get(String(row.code).trim());
    if (!cur) return { row, status: "new" as const, changes: [] };
    const changes: { field: string; old: string; next: string }[] = [];
    for (const f of IMPORT_COMPARE_FIELDS) {
      if (!(f in row)) continue; // chỉ so sánh field có trong file
      const next = normalizeImportValue(f, row[f] ?? "");
      const old = normalizeImportValue(f, String((cur as unknown as Record<string, unknown>)[f] ?? ""));
      if (next && next !== old) changes.push({ field: f, old, next });
    }
    return { row, status: changes.length ? ("update" as const) : ("same" as const), changes };
  });
}

function ImportModal({ existing, onClose, onImported }: { existing: ApiEmployee[]; onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [infos, setInfos] = useState<ImportRowInfo[]>([]);
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; updated: number; deleted: number } | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { mutate: doImport, isLoading } = useMutation(
    (args: { rows: Record<string, unknown>[]; mode: "upsert" | "replace" }) => importEmployees(args.rows, args.mode),
  );

  const counts = useMemo(() => ({
    new: infos.filter((r) => r.status === "new").length,
    update: infos.filter((r) => r.status === "update").length,
    same: infos.filter((r) => r.status === "same").length,
    invalid: infos.filter((r) => r.status === "invalid").length,
  }), [infos]);
  const applyCount = counts.new + counts.update;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    setParsing(true);
    try {
      const { rows, unsupported } = await parseImportFile(file);
      if (rows.length === 0) {
        setError("Không đọc được dòng dữ liệu nào (cần dòng tiêu đề có 'Mã thẻ'/'Họ và tên' + dữ liệu).");
        setInfos([]);
        setUnsupported([]);
      } else {
        setInfos(diffImportRows(rows, existing));
        setUnsupported(unsupported);
      }
    } catch {
      setError("File không hợp lệ. Dùng file .xlsx hoặc .csv (UTF-8).");
    } finally {
      setParsing(false);
    }
  }

  // Đồng bộ sạch: NV hiện có mà mã thẻ KHÔNG có trong file sẽ bị xoá.
  const fileCodeSet = useMemo(
    () => new Set(infos.filter((i) => i.status !== "invalid").map((i) => String(i.row.code).trim())),
    [infos],
  );
  const toDeleteCount = useMemo(
    () => (replaceMode ? existing.filter((e) => !fileCodeSet.has(String(e.code).trim())).length : 0),
    [replaceMode, existing, fileCodeSet],
  );
  // Chấp nhận mọi cách gõ dấu: "XÓA" / "XOÁ" / "xoa" (bỏ dấu khi so sánh).
  const confirmOk =
    !replaceMode ||
    confirmText.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase() === "XOA";

  async function handleImport() {
    // Upsert: chỉ gửi Mới + Cập nhật. Replace: gửi mọi dòng hợp lệ (kể cả "không đổi")
    // để backend biết đủ tập mã thẻ trong file mà xoá NV thừa + xoá trắng ô trống.
    const payload = infos
      .filter((r) => r.status === "new" || r.status === "update" || (replaceMode && r.status === "same"))
      .map((r) => r.row);
    if (payload.length === 0) return;
    if (!confirmOk) return;
    try {
      const res = await doImport({ rows: payload, mode: replaceMode ? "replace" : "upsert" });
      setResult({ created: res.created, updated: res.updated, deleted: res.deleted ?? 0 });
      onImported();
    } catch {
      setError("Cập nhật thất bại. Vui lòng thử lại.");
    }
  }

  const badge: Record<ImportStatus, { label: string; cls: string }> = {
    new: { label: "Mới", cls: "bg-emerald-100 text-emerald-700" },
    update: { label: "Cập nhật", cls: "bg-amber-100 text-amber-700" },
    same: { label: "Không đổi", cls: "bg-gray-100 text-gray-500" },
    invalid: { label: "Lỗi", cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-[860px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Import nhân viên · kiểm tra & cập nhật</div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={40} className="text-[var(--color-success)]" />
            <div className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Đã đồng bộ: {result.created} thêm mới, {result.updated} cập nhật{result.deleted > 0 ? `, ${result.deleted} đã xoá` : ""}
            </div>
            <button onClick={onClose} className="mt-2 rounded-[8px] bg-[var(--color-accent)] px-4 py-1.5 text-[12.5px] font-medium text-white">Đóng</button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between rounded-[10px] bg-[var(--color-page-bg)] px-3 py-2.5 text-[12.5px] text-[var(--color-text-muted)]">
              <span>Hỗ trợ file <b>.xlsx</b> (xuất từ hệ thống) hoặc <b>.csv</b>. Đối chiếu theo <b>Mã thẻ</b>.</span>
              <button onClick={downloadImportTemplate} className="flex items-center gap-1.5 font-medium text-[var(--color-accent)] hover:underline">
                <FileDown size={14} /> Tải file mẫu
              </button>
            </div>

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--color-border)] px-4 py-6 text-[12.5px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {parsing ? "Đang đọc file..." : fileName || "Chọn file .xlsx hoặc .csv để tải lên"}
              <input type="file" accept=".xlsx,.csv,text/csv" onChange={handleFile} className="hidden" />
            </label>

            {error && (
              <div className="mt-3 rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">{error}</div>
            )}

            {unsupported.length > 0 && (
              <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                ⚠️ {unsupported.length} cột chưa được hỗ trợ (sẽ bỏ qua): {unsupported.join(", ")}
              </div>
            )}

            {infos.length > 0 && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="rounded-[20px] bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-700">Mới: {counts.new}</span>
                  <span className="rounded-[20px] bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700">Cập nhật: {counts.update}</span>
                  <span className="rounded-[20px] bg-gray-100 px-2.5 py-0.5 font-medium text-gray-500">Không đổi: {counts.same}</span>
                  {counts.invalid > 0 && <span className="rounded-[20px] bg-red-100 px-2.5 py-0.5 font-medium text-red-700">Lỗi: {counts.invalid}</span>}
                </div>
                <div className="mt-2 max-h-[340px] overflow-auto rounded-[10px] border border-[var(--color-border-light)]">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[var(--color-page-bg)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                      <tr>
                        <th className="px-2.5 py-2 font-medium">Mã thẻ</th>
                        <th className="px-2.5 py-2 font-medium">Họ và tên</th>
                        <th className="px-2.5 py-2 font-medium">Trạng thái</th>
                        <th className="px-2.5 py-2 font-medium">Thay đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {infos.map((info, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-t border-[var(--color-border-light)] align-top",
                            info.status === "new" && "bg-emerald-50/60",
                            info.status === "update" && "bg-amber-50/50",
                            info.status === "invalid" && "bg-red-50/60",
                          )}
                        >
                          <td className="px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{info.row.code || "—"}</td>
                          <td className="px-2.5 py-1.5 font-medium text-[var(--color-text-primary)]">{info.row.name || "—"}</td>
                          <td className="px-2.5 py-1.5">
                            <span className={cn("rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-medium", badge[info.status].cls)}>{badge[info.status].label}</span>
                          </td>
                          <td className="px-2.5 py-1.5 text-[11.5px] text-[var(--color-text-secondary)]">
                            {info.status === "new" ? (
                              <span className="text-emerald-700">Thêm mới toàn bộ</span>
                            ) : info.status === "update" ? (
                              <div className="flex flex-col gap-0.5">
                                {info.changes.map((c) => (
                                  <div key={c.field}>
                                    <span className="text-[var(--color-text-lighter)]">{FIELD_LABELS[c.field] ?? c.field}:</span>{" "}
                                    <span className="text-[var(--color-text-muted)] line-through">{c.old || "—"}</span>{" "}
                                    <span className="font-medium text-amber-700">→ {c.next}</span>
                                  </div>
                                ))}
                              </div>
                            ) : info.status === "invalid" ? (
                              <span className="text-red-600">Thiếu mã thẻ hoặc họ tên</span>
                            ) : (
                              <span className="text-[var(--color-text-lighter)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {infos.length > 0 && (
              <div className="mt-4 rounded-[10px] border border-[var(--color-border)] p-3">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={replaceMode}
                    onChange={(e) => { setReplaceMode(e.target.checked); setConfirmText(""); }}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-danger)]"
                  />
                  <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                    <b className="text-[var(--color-danger)]">Thay toàn bộ danh sách (đồng bộ sạch)</b> — làm cho danh sách khớp
                    <b> đúng file</b>: ô để trống sẽ <b>xoá trắng</b>, và nhân viên không có trong file sẽ bị <b>xoá</b>.
                  </span>
                </label>
                {replaceMode && (
                  <div className="mt-3 rounded-[8px] bg-[var(--color-danger-bg)] px-3 py-2.5 text-[12px] text-[var(--color-danger)]">
                    <div className="font-medium">⚠️ Thao tác không thể hoàn tác:</div>
                    <ul className="ml-4 mt-1 list-disc space-y-0.5">
                      <li><b>{toDeleteCount}</b> nhân viên không có trong file sẽ bị <b>xoá vĩnh viễn</b> (kèm dữ liệu chấm công, lương, KPI… liên quan).</li>
                      <li>Các ô để trống trong file sẽ <b>xoá trắng</b> dữ liệu cũ tương ứng.</li>
                    </ul>
                    <div className="mt-2 flex items-center gap-2">
                      <span>Gõ <b>XÓA</b> để xác nhận:</span>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="XÓA"
                        className="h-8 w-28 rounded-[6px] border border-[var(--color-danger)] bg-white px-2 text-[12.5px] text-[var(--color-text-primary)] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]">Huỷ</button>
              <button
                onClick={handleImport}
                disabled={
                  isLoading || !confirmOk ||
                  (replaceMode ? counts.new + counts.update + counts.same === 0 && toDeleteCount === 0 : applyCount === 0)
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-[8px] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60",
                  replaceMode ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]",
                )}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isLoading
                  ? "Đang đồng bộ..."
                  : replaceMode
                    ? `Đồng bộ sạch (${counts.new + counts.update + counts.same} theo file · ${toDeleteCount} xoá)`
                    : `Cập nhật (${counts.new} mới · ${counts.update} sửa)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

/** Nhân viên đã nghỉ việc (tách khỏi danh sách tổng). */
const isResigned = (e: ApiEmployee) => (e.status ?? "").trim().toLowerCase() === "nghỉ việc";
const isMaternity = (e: ApiEmployee) => (e.status ?? "").trim().toLowerCase().includes("thai sản");
const isProbation = (e: ApiEmployee) => (e.status ?? "").trim().toLowerCase().includes("thử việc");
type EmpView = "active" | "resigned" | "maternity" | "probation";
/** active = không thuộc 3 nhóm còn lại (gồm cả "Đang làm việc" và trạng thái trống). */
const matchesView = (e: ApiEmployee, view: EmpView) =>
  view === "resigned" ? isResigned(e)
  : view === "maternity" ? isMaternity(e)
  : view === "probation" ? isProbation(e)
  : !isResigned(e) && !isMaternity(e) && !isProbation(e);

/** 4 trạng thái làm việc — dùng cho chọn nhanh trong ô Trạng thái. */
const STATUS_OPTIONS = ["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"];

/** Thứ tự ưu tiên bộ phận: BGĐ → Kế toán → Văn phòng → còn lại (SX). */
function deptRank(name: string | null): number {
  const v = (name ?? "").toLocaleLowerCase("vi");
  if (!v) return 99;
  if (/giám đốc|bgđ|ban giám/.test(v)) return 0;
  if (/kế toán/.test(v)) return 1;
  if (/văn phòng|hành chính|nhân sự/.test(v)) return 2;
  return 10;
}
/** Xếp hạng chức vụ trong bộ phận: cao → thấp. */
function posRank(position: string | null, level: string | null): number {
  const v = `${position ?? ""} ${level ?? ""}`.toLocaleLowerCase("vi");
  if (v.includes("giám đốc")) return 0;
  if (v.includes("trưởng phòng")) return 1;
  if (v.includes("phó phòng")) return 2;
  if (v.includes("quản lý") || v.includes("xưởng trưởng")) return 3;
  if (v.includes("tổ trưởng") || v.includes("trưởng nhóm")) return 4;
  if (v.includes("tổ phó")) return 5;
  return 10;
}
/** So sánh mặc định: gom theo bộ phận (ưu tiên) → chức vụ cao trên → tên. */
function defaultEmployeeCompare(a: ApiEmployee, b: ApiEmployee): number {
  return (
    deptRank(a.department_name) - deptRank(b.department_name) ||
    (a.department_name ?? "").localeCompare(b.department_name ?? "", "vi") ||
    posRank(a.position, a.level) - posRank(b.position, b.level) ||
    a.name.localeCompare(b.name, "vi")
  );
}

export function EmployeesScreen({ onNavigate }: { onNavigate: (screen: string, id?: string) => void }) {
  const { role } = useAuth();
  const canEdit = role === "super" || role === "hr";
  const isLeadOrStaff = role === "lead" || role === "staff";

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<EmpView>("active");
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

  // Helper dựng nhanh cột hồ sơ (text) và cột tiền (money) — đều ẩn mặc định.
  const textCol = (id: keyof ApiEmployee, label: string): ColumnDef<ApiEmployee> => ({
    id,
    label,
    defaultHidden: true,
    cellClass: "text-[var(--color-text-muted)]",
    cell: (e) => (e[id] as string) || "-",
    exportValue: (e) => String(e[id] ?? ""),
  });
  const moneyCol = (id: keyof ApiEmployee, label: string): ColumnDef<ApiEmployee> => ({
    id,
    label,
    defaultHidden: true,
    align: "right",
    cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
    cell: (e) => (e[id] ? formatMoney(e[id] as number) : "-"),
    exportValue: (e) => (e[id] as number) ?? 0,
    exportFormat: "money",
  });
  const totalSalary = (e: ApiEmployee) =>
    (e.base_salary ?? 0) + (e.responsibility_salary ?? 0) + (e.allowance ?? 0) + (e.gas_allowance ?? 0) + (e.attendance_bonus ?? 0);

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
      label: "Ngân hàng",
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
      label: "PC công việc",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]",
      cell: (e) => (e.allowance ? formatMoney(e.allowance) : "-"),
      exportValue: (e) => e.allowance ?? 0,
      exportFormat: "money",
    },
    moneyCol("responsibility_salary", "Trách nhiệm"),
    moneyCol("gas_allowance", "PC xăng xe"),
    moneyCol("attendance_bonus", "Chuyên cần"),
    {
      id: "total_salary",
      label: "Tổng lương",
      defaultHidden: true,
      align: "right",
      cellClass: "font-[family-name:var(--font-mono)] font-medium text-[var(--color-text-secondary)]",
      cell: (e) => formatMoney(totalSalary(e)),
      exportValue: (e) => totalSalary(e),
      exportFormat: "money",
    },
    textCol("birth_year", "Năm sinh"),
    textCol("birth_place", "Nơi sinh"),
    textCol("education", "Học lực"),
    textCol("temp_address", "Địa chỉ tạm trú"),
    textCol("cccd_issue_date", "Ngày cấp CCCD"),
    textCol("cccd_issue_place", "Nơi cấp CCCD"),
    textCol("nationality", "Quốc tịch"),
    textCol("religion", "Tôn giáo"),
    textCol("ethnicity", "Dân tộc"),
    textCol("resign_date", "Ngày nghỉ việc"),
    textCol("resign_reason", "Nguyên nhân nghỉ"),
    textCol("contract_date_1", "Ngày HĐLĐ L1"),
    textCol("contract_date_2", "Ngày HĐLĐ L2"),
    textCol("contract_date_3", "Ngày HĐLĐ L3"),
    textCol("bank_account", "Số tài khoản"),
    textCol("bank_branch", "Chi nhánh ngân hàng"),
    textCol("bhxh_no", "Mã số sổ BHXH"),
    textCol("bhxh_increase_date", "Báo tăng BHXH"),
    textCol("bhxh_decrease_date", "Báo giảm BHXH"),
    textCol("relative_name", "Người thân"),
    textCol("relative_relation", "Mối quan hệ"),
    textCol("relative_phone", "SĐT người thân"),
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

  const fmtCustom = (f: CustomField, raw: string) =>
    raw && f.type === "date" ? formatDate(raw) : raw;
  const customColumns: ColumnDef<ApiEmployee>[] = customFields.map((f) => ({
    id: f.id,
    label: f.label,
    align: f.type === "number" ? "right" : undefined,
    cellClass: "text-[var(--color-text-muted)]",
    cell: (e) => fmtCustom(f, getCustomValue(e.id, f.id)) || "-",
    exportValue: (e) => fmtCustom(f, getCustomValue(e.id, f.id)),
    exportFormat: f.type === "number" ? "int" : "text",
  }));

  // Insert custom columns just before the trailing actions column.
  const actionsIdx = columns.findIndex((c) => c.id === "actions");
  const displayColumns =
    actionsIdx >= 0
      ? [...columns.slice(0, actionsIdx), ...customColumns, ...columns.slice(actionsIdx)]
      : [...columns, ...customColumns];

  const { hidden, toggle, reset, visibleColumns, orderedColumns, reorderLocked, toggleReorderLock, moveColumn, placeColumnAfter, renameColumn, widths, setColumnWidth } =
    useColumnPrefs("employees", displayColumns);

  const [sortState, setSortState] = useState<{ colId: string; dir: "asc" | "desc" } | null>(null);
  const [pendingDeleteCol, setPendingDeleteCol] = useState<{ id: string; label: string } | null>(null);
  const [deletingCol, setDeletingCol] = useState(false);

  async function confirmDeleteColumn() {
    if (!pendingDeleteCol) return;
    const { id } = pendingDeleteCol;
    setDeletingCol(true);
    try {
      // Chỉ cột tùy chỉnh mới qua hộp xác nhận này — xóa vĩnh viễn kèm dữ liệu.
      await removeCustomField(id);
      await hydrateCustomData(true);
      setCustomFields(getCustomFields());
      // Dọn lọc/sắp xếp còn sót của cột vừa xóa.
      setColFilters((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      setSortState((s) => (s?.colId === id ? null : s));
      setPendingDeleteCol(null);
    } finally {
      setDeletingCol(false);
    }
  }

  // Thêm cột mới (custom field) từ menu 3-chấm, đặt ngay bên phải cột thao tác.
  // Dùng ref cho "đơn đặt vị trí" để không setState trong effect (cascading render).
  const pendingPlaceRef = useRef<{ newId: string; afterId: string } | null>(null);
  const handleAddColumn = useCallback(
    async (afterColumnId: string, opts: { label: string; type: CustomFieldType }) => {
      const created = await addCustomField({ label: opts.label, type: opts.type });
      pendingPlaceRef.current = { newId: created.id, afterId: afterColumnId };
      setCustomFields(getCustomFields());
    },
    [],
  );
  useEffect(() => {
    const p = pendingPlaceRef.current;
    if (!p) return;
    const ids = orderedColumns.map((c) => c.id);
    if (!ids.includes(p.newId)) return; // chờ cột xuất hiện sau re-render
    pendingPlaceRef.current = null;
    placeColumnAfter(p.newId, p.afterId);
  }, [orderedColumns, placeColumnAfter]);

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
    // Tách danh sách đang làm việc / đã nghỉ việc theo tab.
    let list: ApiEmployee[] = allItems.filter((e) => matchesView(e, view));
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
    } else {
      // Mặc định: gom theo bộ phận (BGĐ → Kế toán → Văn phòng → SX), chức cao ở trên.
      list = [...list].sort(defaultEmployeeCompare);
    }
    return list;
  }, [allItems, view, search, dept, colFilters, displayColumns, sortState]);

  const activeCount = useMemo(() => allItems.filter((e) => matchesView(e, "active")).length, [allItems]);
  const resignedCount = useMemo(() => allItems.filter(isResigned).length, [allItems]);
  const maternityCount = useMemo(() => allItems.filter(isMaternity).length, [allItems]);
  const probationCount = useMemo(() => allItems.filter(isProbation).length, [allItems]);

  // Cột "xoá dòng" (cố định ngoài cùng trái) chỉ hiện khi đang ở chế độ chỉnh cột
  // (bấm nút Khoá cột để mở khoá) — để HR thao tác xoá trực tiếp khi cần.
  const showDeleteCol = !reorderLocked;

  // Cố định (đóng băng) khi cuộn ngang: STT + Mã thẻ + Họ và tên luôn ở bên trái.
  // Tính offset trái tích luỹ theo thứ tự cột hiện tại + độ rộng từng cột.
  const FROZEN_IDS = new Set(["code", "name"]);
  const sttLeft = showDeleteCol ? 44 : 0;
  const frozenLeft: Record<string, number> = {};
  {
    let acc = sttLeft + 52; // sau cột Xoá (nếu có) + cột STT
    for (const c of visibleColumns) {
      if (FROZEN_IDS.has(c.id)) frozenLeft[c.id] = acc;
      acc += colWidth(c);
    }
  }

  // Chỉnh nhanh trạng thái ngay trong bảng (khi ở chế độ chỉnh cột).
  const [savingStatus, setSavingStatus] = useState<number | null>(null);
  async function handleStatusChange(emp: ApiEmployee, status: string) {
    if (status === emp.status) return;
    setSavingStatus(emp.id);
    try {
      await updateEmployee(emp.id, { status });
      refetch();
    } finally {
      setSavingStatus(null);
    }
  }

  const [deletingRow, setDeletingRow] = useState<number | null>(null);
  async function handleDeleteRow(emp: ApiEmployee) {
    if (!window.confirm(`Xoá nhân viên "${emp.name}" (${emp.code})?\nThao tác xoá kèm dữ liệu chấm công/lương/KPI liên quan và KHÔNG thể hoàn tác.`)) return;
    setDeletingRow(emp.id);
    try {
      await deleteEmployee(emp.id);
      refetch();
    } finally {
      setDeletingRow(null);
    }
  }

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

  // Trả về danh sách để xuất, đã sắp xếp theo bộ phận → mã thẻ.
  // Nếu chưa có dữ liệu (đang tải hoặc bộ lọc rỗng) thì báo cho người dùng
  // và trả về null để KHÔNG tạo ra file trắng.
  function getExportRows(): ApiEmployee[] | null {
    if (isLoading && allItems.length === 0) {
      window.alert("Dữ liệu nhân viên đang tải, vui lòng đợi trong giây lát rồi xuất lại.");
      return null;
    }
    // Nếu bộ lọc/tìm kiếm khiến danh sách rỗng nhưng vẫn còn dữ liệu gốc,
    // xuất theo dữ liệu gốc để tránh file trắng ngoài ý muốn.
    const base = filtered.length > 0 ? filtered : allItems;
    if (base.length === 0) {
      window.alert("Không có nhân viên nào để xuất.");
      return null;
    }
    return [...base].sort(
      (a: ApiEmployee, b: ApiEmployee) =>
        (a.department_name ?? "").localeCompare(b.department_name ?? "", "vi") ||
        a.code.localeCompare(b.code, "vi"),
    );
  }

  async function handleExport() {
    const cols = visibleColumns.filter((c) => c.exportValue && c.id !== "actions");
    const sorted = getExportRows();
    if (!sorted) return;
    setExporting(true);
    try {
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

  // Xuất ĐẦY ĐỦ theo mẫu công ty — tiêu đề khớp dữ liệu, đủ mọi trường.
  async function handleFullExport() {
    const sorted = getExportRows();
    if (!sorted) return;
    setExporting(true);
    try {
      await exportStyledExcel({
        filename: `nhan-vien-day-du-${new Date().toISOString().slice(0, 10)}`,
        title: "DANH SÁCH NHÂN VIÊN",
        meta: [
          dept === "all" ? "Bộ phận: Tất cả" : `Bộ phận: ${dept}`,
          `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`,
          `Số lượng: ${sorted.length} nhân viên`,
        ],
        columns: FULL_EXPORT_COLUMNS.map((c) => ({ label: c.label, align: c.align, format: c.format })),
        rows: sorted.map((e) => FULL_EXPORT_COLUMNS.map((c) => c.value(e))),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingDeleteCol && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-[14px] bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-bg)]">
                <Trash2 size={18} className="text-[var(--color-danger)]" />
              </span>
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Xóa cột “{pendingDeleteCol.label}”?
              </div>
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              Đây là <b>cột tùy chỉnh</b>. Xóa sẽ{" "}
              <b className="text-[var(--color-danger)]">xóa vĩnh viễn cột và toàn bộ dữ liệu</b>{" "}
              đã nhập ở cột này cho mọi nhân viên (kể cả trong hồ sơ chi tiết). Hành động không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteCol(null)}
                disabled={deletingCol}
                className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)] disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteColumn}
                disabled={deletingCol}
                className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-danger)] px-4 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {deletingCol ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {importOpen && (
        <ImportModal
          existing={allItems}
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

      <div className="flex items-center gap-1.5">
        {([["active", "Đang làm việc", activeCount], ["resigned", "Đã nghỉ việc", resignedCount], ["maternity", "Thai sản", maternityCount], ["probation", "Thử việc", probationCount]] as [EmpView, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => { setView(key); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              view === key
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]",
            )}
          >
            {label}
            <span className={cn("rounded-full px-1.5 text-[11px]", view === key ? "bg-white/25" : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]")}>{count}</span>
          </button>
        ))}
      </div>

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
            title="Xuất các cột đang hiển thị"
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)] disabled:opacity-60"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button
            onClick={handleFullExport}
            disabled={exporting}
            title="Xuất đầy đủ tất cả cột theo mẫu (tiêu đề khớp dữ liệu) — dùng để import lại"
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)] disabled:opacity-60"
          >
            <Download size={14} /> Xuất đầy đủ
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

      <div className="max-h-[calc(100vh-230px)] overflow-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2 text-[13px]">Đang tải dữ liệu...</span>
          </div>
        ) : (
          <table ref={tableRef} className="w-full min-w-[900px] table-fixed text-[13px]">
            <colgroup>
              {showDeleteCol && <col style={{ width: 44 }} />}
              <col style={{ width: 52 }} />
              {visibleColumns.map((c) => (
                <col key={c.id} style={{ width: colWidth(c) }} />
              ))}
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                {/* Cột xoá dòng — cố định ngoài cùng trái, chỉ hiện khi mở khoá cột */}
                {showDeleteCol && <th style={{ left: 0 }} className="sticky top-0 left-0 z-30 bg-white px-2 py-3 text-center font-medium text-[var(--color-danger)]">Xoá</th>}
                {/* Fixed STT column — always first, never reordered */}
                <th style={{ left: sttLeft }} className="sticky top-0 z-30 bg-white px-4 py-3 text-center font-medium">STT</th>
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
                      style={frozenLeft[c.id] != null ? { left: frozenLeft[c.id] } : undefined}
                      className={cn(
                        "sticky top-0 relative border-l border-[var(--color-border-light)] bg-white px-3 py-3 font-medium",
                        frozenLeft[c.id] != null ? "z-30" : "z-20",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                      )}
                    >
                      <span
                        className={cn(
                          "flex min-w-0 items-start gap-1",
                          c.align === "right" && "justify-end",
                          c.align === "center" && "justify-center",
                        )}
                      >
                        {canDrag && (
                          <span
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                            className="mt-0.5 flex-shrink-0 cursor-grab text-[var(--color-text-lighter)] hover:text-[var(--color-accent)] active:cursor-grabbing"
                            title="Kéo để đổi vị trí cột"
                          >
                            <GripVertical size={13} />
                          </span>
                        )}
                        <span className="min-w-0 whitespace-normal break-words leading-tight">{c.label}</span>
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
                              canRemove={!c.locked && !NON_DELETABLE_COL_IDS.has(c.id)}
                              isCustom={c.id.startsWith("cf_")}
                              onAddColumn={(opts) => handleAddColumn(c.id, opts)}
                              onHide={() => {
                                toggle(c.id);
                                setColFilters((s) => {
                                  const next = { ...s };
                                  delete next[c.id];
                                  return next;
                                });
                                setSortState((s) => (s?.colId === c.id ? null : s));
                              }}
                              onDelete={() => setPendingDeleteCol({ id: c.id, label: c.label })}
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
                  <td colSpan={visibleColumns.length + 1 + (showDeleteCol ? 1 : 0)} className="px-4 py-3">
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
                  className="group cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                >
                  {showDeleteCol && (
                    <td style={{ left: 0 }} className="sticky left-0 z-10 bg-white px-1 py-2.5 text-center group-hover:bg-[var(--color-page-bg)]" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteRow(e)}
                        disabled={deletingRow === e.id}
                        title={`Xoá ${e.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--color-text-lighter)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-50"
                      >
                        {deletingRow === e.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  )}
                  <td style={{ left: sttLeft }} className="sticky z-10 bg-white px-4 py-2.5 text-center font-[family-name:var(--font-mono)] text-[var(--color-text-lighter)] group-hover:bg-[var(--color-page-bg)]">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      data-col={c.id}
                      style={frozenLeft[c.id] != null ? { left: frozenLeft[c.id] } : undefined}
                      className={cn(
                        "overflow-hidden border-l border-[var(--color-border-light)] px-3 py-2.5",
                        frozenLeft[c.id] != null && "sticky z-10 bg-white group-hover:bg-[var(--color-page-bg)]",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.cellClass,
                      )}
                    >
                      <div className={cn("min-w-0 truncate", c.align === "center" && "mx-auto")}>
                        {c.id === "status" && showDeleteCol ? (
                          <select
                            value={e.status ?? ""}
                            disabled={savingStatus === e.id}
                            onClick={(ev) => ev.stopPropagation()}
                            onChange={(ev) => handleStatusChange(e, ev.target.value)}
                            className={cn(
                              "w-full max-w-[150px] cursor-pointer rounded-[6px] border px-1.5 py-1 text-[11.5px] font-medium outline-none focus:border-[var(--color-accent)] disabled:opacity-50",
                              e.status === "Đang làm việc"
                                ? "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                : isResigned(e)
                                  ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                                  : "border-[var(--color-border)] bg-white text-[var(--color-text-muted)]",
                            )}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="text-[var(--color-text-primary)]">{s}</option>
                            ))}
                          </select>
                        ) : (
                          c.cell(e, i)
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1 + (showDeleteCol ? 1 : 0)} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
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
