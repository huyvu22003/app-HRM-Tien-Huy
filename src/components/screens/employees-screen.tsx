"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Upload, Download, Plus, ChevronRight, ChevronLeft, Info, Loader2 } from "lucide-react";
import { fetchEmployees, fetchDepartments, type ApiEmployee, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/hooks";
import { getInitials, cn } from "@/lib/utils";

const PAGE_SIZE = 15;

export function EmployeesScreen({ onNavigate }: { onNavigate: (screen: string, id?: string) => void }) {
  const { role } = useAuth();
  const canEdit = role === "super" || role === "hr";
  const isLeadOrStaff = role === "lead" || role === "staff";

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [page, setPage] = useState(1);

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
          {canEdit && (
            <>
              <button className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
                <Upload size={14} /> Import
              </button>
              <button className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
                <Download size={14} /> Export
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
                <th className="px-4 py-3 font-medium">Mã thẻ</th>
                <th className="px-4 py-3 font-medium">Họ và tên</th>
                <th className="px-4 py-3 font-medium">Bộ phận</th>
                <th className="px-4 py-3 font-medium">Chức vụ</th>
                <th className="px-4 py-3 font-medium">Điện thoại</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((e: ApiEmployee) => {
                const active = e.status === "Đang làm việc";
                return (
                  <tr
                    key={e.id}
                    onClick={() => onNavigate("employee-detail", String(e.id))}
                    className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                  >
                    <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                      {e.code}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                          {getInitials(e.name)}
                        </div>
                        <span className="font-medium text-[var(--color-text-primary)]">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{e.department_name ?? "-"}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{e.position ?? "-"}</td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                      {e.phone ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-[20px] px-2 py-0.5 text-[11px] font-medium",
                          active
                            ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                            : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]"
                        )}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ChevronRight size={15} className="text-[var(--color-text-lighter)]" />
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
