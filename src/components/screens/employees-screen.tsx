"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, Download, Plus, ChevronRight, ChevronLeft, Info, Loader2, Phone, Mail, Briefcase, MapPin } from "lucide-react";
import { fetchEmployees, fetchDepartments, type ApiEmployee, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import { getInitials, cn, formatDate, seededRandom } from "@/lib/utils";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportToCsv } from "@/lib/export";

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
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)]">
          {employee.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[14px] font-semibold text-white">{getInitials(employee.name)}</span>
          )}
        </div>
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

  const employeeFetcher = useCallback(
    () => fetchEmployees({ page, pageSize: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );

  const deptFetcher = useCallback(() => fetchDepartments(), []);

  const { data: empData, isLoading } = useQuery(employeeFetcher, [page, search]);
  const { data: deptData } = useQuery(deptFetcher);

  const departments = useMemo(() => {
    if (!deptData?.data) return [];
    return deptData.data.map((d: ApiDepartment) => d.name);
  }, [deptData]);

  const items = useMemo(() => {
    if (!empData?.data) return [];
    if (dept === "all") return empData.data;
    return empData.data.filter((e: ApiEmployee) => e.department_name === dept);
  }, [empData, dept]);

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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
            {getInitials(e.name)}
          </div>
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

  function handleExport() {
    const cols = visibleColumns.filter((c) => c.exportValue);
    const headers = cols.map((c) => c.label);
    const rows = items.map((e: ApiEmployee, i: number) => cols.map((c) => c.exportValue!(e, i)));
    exportToCsv(`nhan-vien-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  }

  return (
    <div className="flex flex-col gap-4">
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
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
          >
            <Download size={14} /> Xuất Excel
          </button>
          {canEdit && (
            <>
              <button className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
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
