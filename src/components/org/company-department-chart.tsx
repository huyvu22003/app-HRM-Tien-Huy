"use client";

import { useMemo } from "react";
import type { ApiDepartment } from "@/lib/api";
import { selectDepartmentHeadId, type OrgPerson } from "@/lib/org-hierarchy";
import {
  ChartConnectorLayer,
  useChartConnectors,
  type ConnectorEdge,
} from "@/components/org/chart-connector-layer";

const ROOT_NODE_ID = "company-directors";

function normalizeDepartmentName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isDirectorDepartment(department: ApiDepartment): boolean {
  const normalized = normalizeDepartmentName(department.name);
  return (
    normalized === "ban giam doc" ||
    (normalized.includes("ban") &&
      normalized.includes("giam") &&
      normalized.includes("doc"))
  );
}

export function CompanyDepartmentChart({
  departments,
  people,
  onSelectDepartment,
}: {
  departments: ApiDepartment[];
  people: OrgPerson[];
  onSelectDepartment: (department: ApiDepartment) => void;
}) {
  const directorDepartment = useMemo(
    () => departments.find(isDirectorDepartment),
    [departments],
  );
  const childDepartments = useMemo(
    () => departments.filter((department) => department !== directorDepartment),
    [departments, directorDepartment],
  );
  const edges = useMemo<ConnectorEdge[]>(
    () =>
      childDepartments.map((department) => ({
        from: ROOT_NODE_ID,
        to: `department-${department.id}`,
      })),
    [childDepartments],
  );
  const { containerRef, registerNode, paths } = useChartConnectors(edges, "rows");

  if (departments.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--color-border)] bg-[var(--color-page-bg)] px-5 py-12 text-center text-[13px] text-[var(--color-text-muted)]">
        Chưa có phòng ban để hiển thị.
      </div>
    );
  }

  const rootContent = (
    <>
      <span className="block text-[13px] font-semibold">
        {directorDepartment?.name ?? "Ban Giám đốc"}
      </span>
      <span className="mt-1 block text-[11px] text-[var(--color-text-light)]">
        {directorDepartment?.employee_count ?? 0} nhân sự
      </span>
    </>
  );

  return (
    <div
      ref={containerRef}
      className="relative isolate w-full max-w-full overflow-hidden rounded-[10px] bg-[var(--color-page-bg)] px-3 py-6 sm:px-5"
    >
      <ChartConnectorLayer paths={paths} />
      <div className="relative z-10 flex justify-center">
        {directorDepartment ? (
          <button
            ref={registerNode(ROOT_NODE_ID)}
            type="button"
            onClick={() => onSelectDepartment(directorDepartment)}
            className="w-full max-w-[240px] rounded-[12px] border border-[var(--color-accent)] bg-white px-5 py-3 text-center shadow-sm transition hover:shadow-md"
          >
            {rootContent}
          </button>
        ) : (
          <div
            ref={registerNode(ROOT_NODE_ID)}
            className="w-full max-w-[240px] rounded-[12px] border border-[var(--color-accent)] bg-white px-5 py-3 text-center shadow-sm"
          >
            {rootContent}
          </div>
        )}
      </div>

      {childDepartments.length > 0 ? (
        <div className="relative z-10 mx-auto mt-12 grid w-full max-w-[928px] grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          {childDepartments.map((department) => {
            const isMissingHead = department.employee_count > 0
              && department.head_employee_id === null
              && selectDepartmentHeadId(people, {
                departmentId: department.id,
                headEmployeeId: department.head_employee_id,
              }) === null;
            return (
              <button
                key={department.id}
                ref={registerNode(`department-${department.id}`)}
                type="button"
                onClick={() => onSelectDepartment(department)}
                className="min-w-0 rounded-[10px] border border-[var(--color-border)] bg-white p-3 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
              >
                <span className="block break-words text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {department.name}
                </span>
                <span className="mt-1 block text-[11px] text-[var(--color-text-light)]">
                  {department.employee_count} nhân sự
                </span>
                {isMissingHead && (
                  <span className="mt-1 block text-[10.5px] font-medium text-[var(--color-warning)]">
                    Thiếu Trưởng phòng
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="relative z-10 mt-8 text-center text-[12px] text-[var(--color-text-muted)]">
          Chưa có phòng ban trực thuộc.
        </div>
      )}
    </div>
  );
}
