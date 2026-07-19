import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompanyHierarchy,
  buildDepartmentHierarchy,
  apiEmployeeToOrgPerson,
  filterManagerCandidates,
  insertManagerPreview,
  normalizePersonName,
  removeManagerPreview,
  type OrgPerson,
} from "./org-hierarchy.ts";

const people: OrgPerson[] = [
  { id: 1, name: "Mr. Trung", departmentId: 1, departmentName: "Ban Giám đốc", position: "Giám đốc", level: "Ban Giám đốc", managerEmployeeId: null, managerName: null, phone: "0901" },
  { id: 2, name: "Ôn Thị Uy Lam", departmentId: 2, departmentName: "Nhân Sự", position: "Trưởng phòng", level: "Trưởng phòng", managerEmployeeId: null, managerName: null, phone: "0902" },
  { id: 3, name: "Nhân viên A", departmentId: 2, departmentName: "Nhân Sự", position: "Nhân viên", level: "Nhân viên", managerEmployeeId: 2, managerName: "Ôn Thị Uy Lam", phone: "0903" },
  { id: 4, name: "Tổ trưởng B", departmentId: 2, departmentName: "Nhân Sự", position: "Tổ trưởng", level: "Tổ trưởng", managerEmployeeId: 2, managerName: "Ôn Thị Uy Lam", phone: "0904" },
  { id: 5, name: "Nhân viên B", departmentId: 2, departmentName: "Nhân Sự", position: "Nhân viên", level: "Nhân viên", managerEmployeeId: 4, managerName: "Tổ trưởng B", phone: "0905" },
];

describe("normalizePersonName", () => {
  it("normalizes whitespace and case for legacy manager matching", () => {
    assert.equal(normalizePersonName("  Hồ   Thị Phương "), "hồ thị phương");
  });
});

it("maps stable manager fields from the employee API", () => {
  const person = apiEmployeeToOrgPerson({
    id: 9,
    name: "A",
    department_id: 2,
    department_name: "Nhân Sự",
    position: "Nhân viên",
    level: "Nhân viên",
    manager_employee_id: 2,
    manager_name: "Ôn Thị Uy Lam",
    manager: "Ôn Thị Uy Lam",
    phone: null,
  });
  assert.equal(person.managerEmployeeId, 2);
  assert.equal(person.managerName, "Ôn Thị Uy Lam");
});

describe("department hierarchy", () => {
  it("builds manager-to-employee levels", () => {
    const result = buildDepartmentHierarchy(people, { departmentId: 2, headEmployeeId: 2 });
    assert.equal(result.roots[0].person.id, 2);
    assert.deepEqual(result.roots[0].children.map((node) => node.person.id), [4, 3]);
    assert.equal(result.roots[0].children[0].children[0].person.id, 5);
    assert.deepEqual(result.unassigned, []);
  });

  it("cuts cycles and keeps every department employee visible", () => {
    const cyclic = people.map((person) =>
      person.id === 2 ? { ...person, managerEmployeeId: 5 } : person,
    );
    const result = buildDepartmentHierarchy(cyclic, { departmentId: 2, headEmployeeId: 2 });
    const visible = new Set(
      [...result.roots, ...result.unassigned].flatMap((node) => [
        node.person.id,
        ...node.descendantIds,
      ]),
    );
    assert.deepEqual([...visible].sort((a, b) => a - b), [2, 3, 4, 5]);
    assert.equal(result.warnings.some((warning) => warning.code === "cycle"), true);
  });
});

describe("company hierarchy", () => {
  it("attaches department heads below the director", () => {
    const result = buildCompanyHierarchy(people, [{ id: 2, headEmployeeId: 2 }]);
    assert.equal(result.roots[0].person.id, 1);
    assert.equal(result.roots[0].children[0].person.id, 2);
  });
});

describe("editing previews", () => {
  it("filters self, descendants, other departments and non-managers", () => {
    assert.deepEqual(filterManagerCandidates(3, people).map((person) => person.id), [2, 4]);
  });

  it("inserts a manager between a parent and branch root", () => {
    assert.deepEqual(
      insertManagerPreview(people, { candidateId: 4, branchRootId: 3 }).updates,
      [
        { employeeId: 4, managerEmployeeId: 2 },
        { employeeId: 3, managerEmployeeId: 4 },
      ],
    );
  });

  it("promotes direct reports when removing a management level", () => {
    const updates = removeManagerPreview(people, 4).updates;
    assert.equal(updates.some((update) => update.employeeId === 5 && update.managerEmployeeId === 2), true);
    assert.equal(updates.some((update) => update.employeeId === 4 && update.managerEmployeeId === 2), true);
  });
});
