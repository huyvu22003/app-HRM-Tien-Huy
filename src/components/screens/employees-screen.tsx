"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, Download, Plus, ChevronRight, ChevronLeft, Info, Loader2, Phone, Mail, Briefcase, MapPin } from "lucide-react";
import { fetchEmployees, fetchDepartments, importEmployees, type ApiEmployee, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, seededRandom } from "@/lib/utils";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportStyledExcel } from "@/lib/excel-export";
import { getEmployeePhoto } from "@/lib/photo-store";
import { parseCsvObjects } from "@/lib/csv";
import { X, CheckCircle2, FileDown } from "lucide-react";

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
  const [hoveredEmployee, setHoveredEmployee] = useState<ApiEmployee | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deptFetcher = useCallback(() => fetchDepartments(), []);
  const { data: deptData } = useQuery(deptFetcher);

  const departments = useMemo(() => {
    if (!deptData?.data) return [];
    return deptData.data.map((d: ApiDepartment) => d.name);
  }, [deptData]);

  // Resolve the selected department name → id so filtering happens server-side
  // (across all pages), not just within the current paginated slice.
  const deptId = useMemo(() => {
    if (dept === "all" || !deptData?.data) return undefined;
    return deptData.data.find((d: ApiDepartment) => d.name === dept)?.id;
  }, [dept, deptData]);

  const employeeFetcher = useCallback(
    () =>
      fetchEmployees({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        departmentId: deptId,
      }),
    [page, search, deptId],
  );

  const { data: empData, isLoading, refetch } = useQuery(employeeFetcher, [page, search, deptId]);
  const [importOpen, setImportOpen] = useState(false);

  const items = useMemo(() => empData?.data ?? [], [empData]);

  const totalPages = empData?.totalPages ?? 1;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page on filter change
    setPage(1);
  }, [search, dept]);

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
      align: "right",
      cell: () => <ChevronRight size={15} className="text-[var(--color-text-lighter)]" />,
    },
  ];

  const { hidden, toggle, reset, visibleColumns } = useColumnPrefs("employees", columns);

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    const cols = visibleColumns.filter((c) => c.exportValue);
    setExporting(true);
    try {
      // Export the full filtered set (all pages), not just the current page,
      // and group employees by department so teammates sit together.
      const all = await fetchEmployees({
        page: 1,
        pageSize: 1000,
        search: search || undefined,
        departmentId: deptId,
      });
      const sorted = [...(all.data ?? [])].sort(
        (a: ApiEmployee, b: ApiEmployee) =>
          (a.department_name ?? "").localeCompare(b.department_name ?? "", "vi") ||
          a.code.localeCompare(b.code, "vi"),
      );
      exportStyledExcel({
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
          <ColumnMenu columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} />
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
              <button className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]">
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
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                {visibleColumns.map((c) => (
                  <th
                    key={c.id}
                    className={cn(
                      "px-4 py-3 font-medium",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((e: ApiEmployee, i: number) => (
                <tr
                  key={e.id}
                  onClick={() => onNavigate("employee-detail", String(e.id))}
                  className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                >
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      className={cn(
                        "px-4 py-2.5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.cellClass,
                      )}
                    >
                      {c.cell(e, i)}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
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
          Hiển thị {items.length} / {empData?.total ?? 0} nhân viên
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
