import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompactDepartmentHierarchy,
  buildCompanyHierarchy,
  buildDepartmentHierarchy,
  apiEmployeeToOrgPerson,
  filterManagerCandidates,
  insertManagerPreview,
  normalizePersonName,
  removeManagerPreview,
  selectDepartmentHeadId,
  type OrgPerson,
} from "./org-hierarchy.ts";
import * as hierarchyModule from "./org-hierarchy.ts";

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

describe("selectDepartmentHeadId", () => {
  const person = (
    id: number,
    name: string,
    position: string,
    departmentId = 2,
    managerEmployeeId: number | null = null,
  ): OrgPerson => ({
    id,
    name,
    departmentId,
    departmentName: "Nhân sự",
    position,
    level: position,
    managerEmployeeId,
    managerName: null,
    phone: null,
  });

  it("uses an explicit head when that employee belongs to the department", () => {
    const staff = [
      person(10, "A", "Trưởng phòng"),
      person(11, "B", "Tổ trưởng"),
    ];
    assert.equal(
      selectDepartmentHeadId(staff, { departmentId: 2, headEmployeeId: 11 }),
      11,
    );
  });

  it("falls back to the unique unparented department head", () => {
    const roles = [
      person(10, "Trưởng phòng", "Trưởng phòng"),
      person(11, "Phó phòng", "Phó phòng"),
      person(12, "Quản lý", "Quản lý"),
      person(13, "Xưởng trưởng", "Xưởng trưởng"),
      person(14, "Tổ trưởng", "Tổ trưởng"),
      person(15, "Trưởng nhóm", "Trưởng nhóm"),
      person(16, "Tổ phó", "Tổ phó"),
      person(17, "Other department", "Trưởng phòng", 3),
      person(18, "Managed trưởng phòng", "Trưởng phòng", 2, 10),
    ];
    assert.equal(selectDepartmentHeadId(roles, { departmentId: 2 }), 10);
  });

  it("falls back from an unparented department head to the highest team leader", () => {
    const staff = [
      person(10, "Top team leader", "Tổ trưởng"),
      person(11, "Nested team leader", "Tổ trưởng", 2, 10),
      person(12, "Regular employee", "Nhân viên", 2, 11),
    ];

    assert.equal(selectDepartmentHeadId(staff, { departmentId: 2 }), 10);
    assert.equal(
      selectDepartmentHeadId([person(9, "Department head", "Trưởng phòng"), ...staff], {
        departmentId: 2,
      }),
      9,
    );
  });

  it("does not promote other management roles as fallback roots", () => {
    for (const role of [
      "Phó phòng",
      "Quản lý",
      "Xưởng trưởng",
      "Trưởng nhóm",
      "Tổ phó",
    ]) {
      assert.equal(
        selectDepartmentHeadId([person(10, role, role)], { departmentId: 2 }),
        null,
        role,
      );
    }
  });

  it("returns null when the department contains only regular employees", () => {
    assert.equal(
      selectDepartmentHeadId(
        [person(10, "A", "Nhân viên"), person(11, "B", "Kỹ thuật viên")],
        { departmentId: 2 },
      ),
      null,
    );
  });

  it("returns null when multiple root managers share the best role rank", () => {
    const managers = [
      person(10, "A", "Trưởng phòng"),
      person(11, "B", "Trưởng phòng"),
      person(12, "C", "Phó phòng"),
    ];

    assert.equal(selectDepartmentHeadId(managers, { departmentId: 2 }), null);
    assert.equal(
      selectDepartmentHeadId([...managers].reverse(), { departmentId: 2 }),
      null,
    );
  });
});

describe("compact department hierarchy", () => {
  it("groups leaf employees under their nearest visible management node", () => {
    const result = buildCompactDepartmentHierarchy(people, {
      departmentId: 2,
      headEmployeeId: 2,
    });

    assert.equal(result.root?.person.id, 2);
    assert.deepEqual(result.root?.children.map((node) => node.person.id), [4]);
    assert.deepEqual(result.root?.employees.map((employee) => employee.id), [3]);
    assert.deepEqual(result.root?.children[0].employees.map((employee) => employee.id), [5]);
    assert.deepEqual(result.root?.descendantIds, [4, 5, 3]);
  });

  it("groups sixty direct regular employees without creating child nodes", () => {
    const head = people[1];
    const directReports = Array.from({ length: 60 }, (_, index): OrgPerson => ({
      ...people[2],
      id: 100 + index,
      name: `Nhân viên ${index + 1}`,
      managerEmployeeId: head.id,
    }));
    const result = buildCompactDepartmentHierarchy([head, ...directReports], {
      departmentId: 2,
      headEmployeeId: head.id,
    });

    assert.equal(result.root?.children.length, 0);
    assert.equal(result.root?.employees.length, 60);
  });

  it("keeps every employee visible when cycles are cut", () => {
    const cyclic = people.map((person) =>
      person.id === 2 ? { ...person, managerEmployeeId: 5 } : person,
    );
    const result = buildCompactDepartmentHierarchy(cyclic, {
      departmentId: 2,
      headEmployeeId: 2,
    });
    const compactNodes = [result.root, ...result.additionalRoots, ...result.unassigned].filter(
      (node): node is NonNullable<typeof node> => node !== null,
    );
    const visible = new Set(
      compactNodes.flatMap((node) => [node.person.id, ...node.descendantIds]),
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
  it("excludes current and higher ancestors from insert-manager candidates", () => {
    const filterInsertManagerCandidates = (
      hierarchyModule as typeof hierarchyModule & {
        filterInsertManagerCandidates?: (employeeId: number, people: OrgPerson[]) => OrgPerson[];
      }
    ).filterInsertManagerCandidates;
    assert.ok(filterInsertManagerCandidates, "filterInsertManagerCandidates must be exported");

    const chain: OrgPerson[] = [
      { ...people[1], id: 20, name: "Head", managerEmployeeId: null },
      { ...people[3], id: 21, name: "Manager", managerEmployeeId: 20 },
      { ...people[3], id: 22, name: "Branch", managerEmployeeId: 21 },
      { ...people[3], id: 23, name: "Sibling manager", managerEmployeeId: 20 },
      { ...people[3], id: 24, name: "Descendant manager", managerEmployeeId: 22 },
    ];

    assert.deepEqual(
      filterInsertManagerCandidates(22, chain).map((person) => person.id),
      [23],
    );
  });

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
