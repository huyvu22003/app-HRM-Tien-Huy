// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CompanyDepartmentChart } from "./company-department-chart";
import { DepartmentManagementChart } from "./department-management-chart";
import { EmployeeGroupPanel } from "./employee-group-panel";
import type { CompactDepartmentTreeResult, OrgPerson } from "../../lib/org-hierarchy";

const manager: OrgPerson = {
  id: 1,
  name: "Manager",
  departmentId: 2,
  departmentName: "Nhân sự",
  position: "Trưởng phòng",
  level: "Trưởng phòng",
  managerEmployeeId: null,
  managerName: null,
  phone: null,
};

const employee = {
  id: 2,
  code: "NV001",
  name: "Employee Alpha",
  departmentId: 2,
  departmentName: "Nhân sự",
  position: "Nhân viên",
  level: "Nhân viên",
  managerEmployeeId: 1,
  managerName: "Manager",
  phone: null,
} as OrgPerson & { code: string };

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("EmployeeGroupPanel", () => {
  it("searches by employee business code", () => {
    render(
      <EmployeeGroupPanel
        manager={manager}
        employees={[employee]}
        onClose={() => {}}
        onSelectEmployee={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "NV001" } });
    expect(screen.getByText("Employee Alpha")).toBeTruthy();
  });
});

describe("DepartmentManagementChart", () => {
  it("closes the group panel before opening an employee profile", () => {
    const onSelectEmployee = vi.fn();
    const tree: CompactDepartmentTreeResult = {
      root: { person: manager, children: [], employees: [employee], descendantIds: [2] },
      additionalRoots: [],
      unassigned: [],
      warnings: [],
    };
    render(<DepartmentManagementChart tree={tree} onSelectEmployee={onSelectEmployee} />);

    fireEvent.click(screen.getByRole("button", { name: /1 nhân viên do Manager quản lý/i }));
    fireEvent.click(screen.getByRole("button", { name: /Employee Alpha/i }));

    expect(onSelectEmployee).toHaveBeenCalledWith(employee);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a distinct empty-department state", () => {
    const tree: CompactDepartmentTreeResult = {
      root: null,
      additionalRoots: [],
      unassigned: [],
      warnings: [],
    };
    render(<DepartmentManagementChart tree={tree} onSelectEmployee={() => {}} />);

    expect(screen.getByText(/Chưa có nhân sự/i)).toBeTruthy();
    expect(screen.queryByText(/Chưa xác định Trưởng phòng/i)).toBeNull();
  });
});

describe("CompanyDepartmentChart", () => {
  it("shows a missing-head warning for a staffed department without a valid head", () => {
    render(
      <CompanyDepartmentChart
        departments={[
          { id: 1, name: "Ban Giám đốc", block: "BGĐ", block_color: "", head_employee_id: null, parent_id: null, employee_count: 0 },
          { id: 2, name: "Nhân sự", block: "VP", block_color: "", head_employee_id: null, parent_id: null, employee_count: 1 },
        ]}
        people={[employee]}
        onSelectDepartment={() => {}}
      />,
    );

    expect(screen.getByText(/Thiếu Trưởng phòng/i)).toBeTruthy();
  });
});
