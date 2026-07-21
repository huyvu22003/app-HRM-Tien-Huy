# Compact Organization Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreadable all-employee horizontal chart with a compact company department chart and per-department management charts that group regular employees.

**Architecture:** Keep hierarchy validation and edit operations in `src/lib/org-hierarchy.ts`, but add a compact projection that separates management nodes from leaf employees. Render the company overview and department detail with dedicated components, and draw connectors from measured DOM rectangles through one reusable SVG layer. The organization screen owns selection and modal state; leaf employee search lives in a focused side panel.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, native Node test runner, ResizeObserver, SVG.

---

## Preconditions and file map

The implementation branch must first include the latest `origin/main`. At specification time, GitHub reported `main` at `c2c6e130c7ab7f0bcfb244aa591dcce7f78c8fd2`, while this plan branch starts from the earlier hierarchy head. Do not edit application files until the sync succeeds.

Files and responsibilities:

- Modify `src/lib/org-hierarchy.ts`: choose the department root and project a full hierarchy into management nodes plus grouped leaf employees.
- Modify `src/lib/org-hierarchy.test.ts`: cover root fallback, grouping, cycles, and large teams.
- Create `src/lib/org-chart-layout.ts`: pure connector path and grid calculations.
- Create `src/lib/org-chart-layout.test.ts`: verify connector geometry without a browser.
- Create `src/components/org/chart-connector-layer.tsx`: measure registered nodes and render responsive SVG paths.
- Create `src/components/org/company-department-chart.tsx`: Ban Giám đốc → responsive department grid.
- Create `src/components/org/employee-group-panel.tsx`: searchable employee panel.
- Create `src/components/org/department-management-chart.tsx`: management-only chart with employee group nodes, pan, scroll, collapse, and recenter controls.
- Modify `src/components/screens/org-screen.tsx`: remove the company people tab and integrate the new overview/detail components.
- Delete `src/components/org/org-chart-canvas.tsx` after all consumers move to the new components.
- Modify `docs/HANDOFF.md`: record synchronization, behavior, verification, and continuation rules.

### Task 0: Synchronize with main and establish the execution branch

**Files:**
- No application file changes.

- [ ] **Step 1: Confirm generated directories remain untracked**

Run:

```powershell
git status --short
```

Expected: `.npm-cache/` and `.superpowers/` may appear as untracked; no application source changes should be present.

- [ ] **Step 2: Fetch the shared branches**

Run:

```powershell
git fetch origin main claude/serene-shannon-u01sqc
```

Expected: `origin/main` resolves to `c2c6e13` or a newer commit.

- [ ] **Step 3: Integrate main without overwriting concurrent work**

Run:

```powershell
git merge origin/main
```

Expected: a clean merge. If conflicts occur in organization files, stop and resolve them by preserving both the latest shared behavior and the approved compact-chart specification. Do not use `git checkout --theirs`, `git checkout --ours`, or destructive reset commands.

- [ ] **Step 4: Verify the merged baseline**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
```

Expected: 8 existing hierarchy tests pass, typecheck exits 0, and lint reports no errors.

- [ ] **Step 5: Commit only if the merge produced a merge commit**

Run:

```powershell
git status --short --branch
git log -3 --oneline
```

Expected: working tree contains only the two generated untracked directories.

### Task 1: Build the compact department hierarchy projection

**Files:**
- Modify: `src/lib/org-hierarchy.ts`
- Modify: `src/lib/org-hierarchy.test.ts`

- [ ] **Step 1: Write failing tests for head selection**

Add imports and tests to `src/lib/org-hierarchy.test.ts`:

```ts
import {
  buildCompactDepartmentHierarchy,
  selectDepartmentHeadId,
} from "./org-hierarchy.ts";

describe("department head selection", () => {
  it("uses the explicit department head first", () => {
    assert.equal(
      selectDepartmentHeadId(people, { departmentId: 2, headEmployeeId: 4 }),
      4,
    );
  });

  it("falls back to a root department head, then the highest team leader", () => {
    assert.equal(
      selectDepartmentHeadId(people, { departmentId: 2, headEmployeeId: null }),
      2,
    );

    const withoutHead = people.map((person) =>
      person.id === 2
        ? { ...person, position: "Nhân viên", level: "Nhân viên" }
        : person,
    );
    assert.equal(
      selectDepartmentHeadId(withoutHead, { departmentId: 2, headEmployeeId: null }),
      4,
    );
  });

  it("does not choose a regular employee as department head", () => {
    const regular = people
      .filter((person) => person.departmentId === 2)
      .map((person) => ({
        ...person,
        position: "Nhân viên",
        level: "Nhân viên",
        managerEmployeeId: null,
      }));
    assert.equal(
      selectDepartmentHeadId(regular, { departmentId: 2, headEmployeeId: null }),
      null,
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm the new API is missing**

Run:

```powershell
npm.cmd test
```

Expected: FAIL because `selectDepartmentHeadId` and `buildCompactDepartmentHierarchy` are not exported.

- [ ] **Step 3: Add compact hierarchy types and root selection**

Add to `src/lib/org-hierarchy.ts`:

```ts
export interface CompactOrgNode {
  person: OrgPerson;
  children: CompactOrgNode[];
  employees: OrgPerson[];
  descendantIds: number[];
}

export interface CompactDepartmentTreeResult {
  root: CompactOrgNode | null;
  additionalRoots: CompactOrgNode[];
  unassigned: OrgNode[];
  warnings: OrgWarning[];
}

function roleRank(person: Pick<OrgPerson, "position" | "level">): number {
  const role = `${person.position ?? ""} ${person.level ?? ""}`.toLocaleLowerCase("vi");
  if (role.includes("trưởng phòng")) return 0;
  if (role.includes("phó phòng")) return 1;
  if (role.includes("quản lý") || role.includes("xưởng trưởng")) return 2;
  if (role.includes("tổ trưởng") || role.includes("trưởng nhóm")) return 3;
  if (role.includes("tổ phó")) return 4;
  return 99;
}

export function selectDepartmentHeadId(
  allPeople: OrgPerson[],
  department: { departmentId: number; headEmployeeId?: number | null },
): number | null {
  const staff = allPeople.filter((person) => person.departmentId === department.departmentId);
  if (department.headEmployeeId && staff.some((person) => person.id === department.headEmployeeId)) {
    return department.headEmployeeId;
  }
  return staff
    .filter((person) => isManagementRole(person))
    .filter((person) => person.managerEmployeeId === null || !staff.some((candidate) => candidate.id === person.managerEmployeeId))
    .sort((a, b) => roleRank(a) - roleRank(b) || a.name.localeCompare(b.name, "vi"))[0]?.id ?? null;
}
```

Refactor `comparePeople` to call `roleRank` so role ordering has one source of truth.

- [ ] **Step 4: Write failing tests for employee grouping**

Add:

```ts
describe("compact department hierarchy", () => {
  it("keeps managers as tree nodes and groups leaf employees", () => {
    const result = buildCompactDepartmentHierarchy(people, {
      departmentId: 2,
      headEmployeeId: 2,
    });
    assert.equal(result.root?.person.id, 2);
    assert.deepEqual(result.root?.employees.map((person) => person.id), [3]);
    assert.deepEqual(result.root?.children.map((node) => node.person.id), [4]);
    assert.deepEqual(result.root?.children[0].employees.map((person) => person.id), [5]);
  });

  it("groups sixty regular employees without creating sixty tree nodes", () => {
    const largeTeam = Array.from({ length: 60 }, (_, index): OrgPerson => ({
      id: 100 + index,
      name: `Nhân viên ${index + 1}`,
      departmentId: 2,
      departmentName: "Nhân Sự",
      position: "Nhân viên",
      level: "Nhân viên",
      managerEmployeeId: 2,
      managerName: "Ôn Thị Uy Lam",
      phone: null,
    }));
    const result = buildCompactDepartmentHierarchy([...people.slice(0, 2), ...largeTeam], {
      departmentId: 2,
      headEmployeeId: 2,
    });
    assert.equal(result.root?.children.length, 0);
    assert.equal(result.root?.employees.length, 60);
  });
});
```

- [ ] **Step 5: Implement the compact projection**

Add:

```ts
function projectCompactNode(node: OrgNode): CompactOrgNode {
  const managementChildren = node.children.filter(
    (child) => isManagementRole(child.person) || child.children.length > 0,
  );
  const employees = node.children
    .filter((child) => !managementChildren.includes(child))
    .map((child) => child.person)
    .sort(comparePeople);
  return {
    person: node.person,
    children: managementChildren.map(projectCompactNode),
    employees,
    descendantIds: [...node.descendantIds],
  };
}

export function buildCompactDepartmentHierarchy(
  allPeople: OrgPerson[],
  department: { departmentId: number; headEmployeeId?: number | null },
): CompactDepartmentTreeResult {
  const headEmployeeId = selectDepartmentHeadId(allPeople, department);
  const full = buildDepartmentHierarchy(allPeople, {
    ...department,
    headEmployeeId,
  });
  const projected = full.roots.map(projectCompactNode);
  const rootIndex = headEmployeeId
    ? projected.findIndex((node) => node.person.id === headEmployeeId)
    : -1;
  return {
    root: rootIndex >= 0 ? projected[rootIndex] : null,
    additionalRoots: projected.filter((_, index) => index !== rootIndex),
    unassigned: full.unassigned,
    warnings: full.warnings,
  };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
```

Expected: all hierarchy tests pass and typecheck exits 0.

- [ ] **Step 7: Commit the hierarchy projection**

Run:

```powershell
git add src/lib/org-hierarchy.ts src/lib/org-hierarchy.test.ts
git commit -m "feat: project compact department hierarchies"
```

### Task 2: Add deterministic connector geometry

**Files:**
- Create: `src/lib/org-chart-layout.ts`
- Create: `src/lib/org-chart-layout.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Extend the native test command**

Change `package.json`:

```json
"test": "node --test --experimental-strip-types --test-isolation=none src/lib/org-hierarchy.test.ts src/lib/org-chart-layout.test.ts"
```

- [ ] **Step 2: Write failing connector geometry tests**

Create `src/lib/org-chart-layout.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildElbowPath, getResponsiveColumnCount } from "./org-chart-layout.ts";

describe("organization chart layout", () => {
  it("builds a vertical-horizontal-vertical connector", () => {
    assert.equal(
      buildElbowPath({ x: 100, y: 40 }, { x: 260, y: 140 }),
      "M 100 40 V 90 H 260 V 140",
    );
  });

  it("uses readable responsive department columns", () => {
    assert.equal(getResponsiveColumnCount(420, 220, 16), 1);
    assert.equal(getResponsiveColumnCount(760, 220, 16), 3);
    assert.equal(getResponsiveColumnCount(1200, 220, 16), 4);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run:

```powershell
npm.cmd test
```

Expected: FAIL because `org-chart-layout.ts` does not exist.

- [ ] **Step 4: Implement pure geometry helpers**

Create `src/lib/org-chart-layout.ts`:

```ts
export interface ChartPoint {
  x: number;
  y: number;
}

export function buildElbowPath(from: ChartPoint, to: ChartPoint): string {
  const middleY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} V ${middleY} H ${to.x} V ${to.y}`;
}

export function getResponsiveColumnCount(
  containerWidth: number,
  cardWidth: number,
  gap: number,
): number {
  const available = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
  return Math.min(4, available);
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: hierarchy and layout tests pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add package.json src/lib/org-chart-layout.ts src/lib/org-chart-layout.test.ts
git commit -m "test: define organization chart connector geometry"
```

### Task 3: Build the responsive company department chart

**Files:**
- Create: `src/components/org/chart-connector-layer.tsx`
- Create: `src/components/org/company-department-chart.tsx`

- [ ] **Step 1: Implement the reusable measured connector layer**

Create `src/components/org/chart-connector-layer.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildElbowPath } from "@/lib/org-chart-layout";

export interface ConnectorEdge {
  from: string;
  to: string;
}

interface MeasuredPath {
  key: string;
  d: string;
}

export function useChartConnectors(edges: ConnectorEdge[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<MeasuredPath[]>([]);

  const registerNode = useCallback((id: string) => (element: HTMLElement | null) => {
    if (element) nodesRef.current.set(id, element);
    else nodesRef.current.delete(id);
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setPaths(edges.flatMap((edge) => {
      const from = nodesRef.current.get(edge.from)?.getBoundingClientRect();
      const to = nodesRef.current.get(edge.to)?.getBoundingClientRect();
      if (!from || !to) return [];
      return [{
        key: `${edge.from}-${edge.to}`,
        d: buildElbowPath(
          { x: from.left + from.width / 2 - bounds.left, y: from.bottom - bounds.top },
          { x: to.left + to.width / 2 - bounds.left, y: to.top - bounds.top },
        ),
      }];
    }));
  }, [edges]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    nodesRef.current.forEach((node) => observer.observe(node));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { containerRef, registerNode, paths, measure };
}

export function ChartConnectorLayer({ paths }: { paths: MeasuredPath[] }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Implement the company department grid**

Create `src/components/org/company-department-chart.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import type { ApiDepartment } from "@/lib/api";
import {
  ChartConnectorLayer,
  useChartConnectors,
  type ConnectorEdge,
} from "./chart-connector-layer";

export function CompanyDepartmentChart({
  departments,
  onSelectDepartment,
}: {
  departments: ApiDepartment[];
  onSelectDepartment: (department: ApiDepartment) => void;
}) {
  const directorDepartment = departments.find((department) => department.name === "Ban Giám đốc");
  const childDepartments = departments.filter((department) => department.id !== directorDepartment?.id);
  const edges = useMemo<ConnectorEdge[]>(
    () => childDepartments.map((department) => ({
      from: "director",
      to: `department-${department.id}`,
    })),
    [childDepartments],
  );
  const { containerRef, registerNode, paths } = useChartConnectors(edges);

  if (!departments.length) {
    return <div className="py-16 text-center text-[13px] text-[var(--color-text-light)]">Chưa có phòng ban</div>;
  }

  return (
    <div ref={containerRef} className="relative min-h-[420px] rounded-[10px] bg-[var(--color-page-bg)] p-6">
      <ChartConnectorLayer paths={paths} />
      <div className="relative z-10 flex flex-col items-center">
        <button
          ref={registerNode("director")}
          onClick={() => directorDepartment && onSelectDepartment(directorDepartment)}
          className="min-w-[220px] rounded-[12px] border-2 border-[var(--color-accent)] bg-white px-6 py-4 text-center shadow-sm"
        >
          <span className="block text-[13px] font-semibold">Ban Giám đốc</span>
          <span className="mt-1 block text-[11px] text-[var(--color-text-light)]">
            {directorDepartment?.employee_count ?? 0} nhân viên
          </span>
        </button>
        <div className="mt-14 grid w-full grid-cols-[repeat(auto-fit,minmax(190px,220px))] justify-center gap-x-4 gap-y-12">
          {childDepartments.map((department) => (
            <button
              key={department.id}
              ref={registerNode(`department-${department.id}`)}
              onClick={() => onSelectDepartment(department)}
              className="rounded-[10px] border border-[var(--color-border)] bg-white p-3 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
            >
              <Building2 size={16} className="mb-2 text-[var(--color-accent)]" />
              <span className="block truncate text-[12.5px] font-semibold">{department.name}</span>
              <span className="mt-1 block text-[11px] text-[var(--color-text-light)]">
                {department.employee_count} nhân viên
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck the isolated components**

Run:

```powershell
npm.cmd run typecheck
```

Expected: exits 0. If the current `ApiDepartment` type is not exported, import the existing exported department response type instead; do not duplicate the API shape.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/components/org/chart-connector-layer.tsx src/components/org/company-department-chart.tsx
git commit -m "feat: add responsive company department chart"
```

### Task 4: Build the employee group panel

**Files:**
- Create: `src/components/org/employee-group-panel.tsx`

- [ ] **Step 1: Implement normalized search and responsive panel**

Create `src/components/org/employee-group-panel.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";
import { normalizePersonName, type OrgPerson } from "@/lib/org-hierarchy";

export function EmployeeGroupPanel({
  manager,
  employees,
  onClose,
  onSelectEmployee,
}: {
  manager: OrgPerson;
  employees: OrgPerson[];
  onClose: () => void;
  onSelectEmployee: (employee: OrgPerson) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = normalizePersonName(query);
  const filtered = useMemo(
    () => employees.filter((employee) =>
      normalizePersonName(`${employee.name} ${employee.id} ${employee.position ?? ""}`).includes(normalized),
    ),
    [employees, normalized],
  );

  return (
    <aside className="fixed inset-0 z-40 bg-black/30 md:absolute md:inset-y-0 md:right-0 md:left-auto md:w-[360px] md:bg-transparent">
      <div className="ml-auto flex h-full w-full max-w-[420px] flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <div className="text-[14px] font-semibold">{employees.length} nhân viên</div>
            <div className="mt-1 text-[11px] text-[var(--color-text-light)]">Quản lý: {manager.name}</div>
          </div>
          <button onClick={onClose} aria-label="Đóng danh sách"><X size={18} /></button>
        </div>
        <label className="m-4 flex items-center gap-2 rounded-[8px] border px-3">
          <Search size={15} className="text-[var(--color-text-light)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên, mã hoặc chức vụ"
            className="h-10 min-w-0 flex-1 outline-none"
          />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {filtered.map((employee) => {
            const photo = getEmployeePhoto(employee.id);
            return (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className="mb-2 flex w-full items-center gap-3 rounded-[9px] border p-3 text-left hover:border-[var(--color-accent)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                  {photo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={photo} alt="" className="h-full w-full object-cover" />
                    : getInitials(employee.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold">{employee.name}</span>
                  <span className="block truncate text-[11px] text-[var(--color-text-light)]">{employee.position ?? "Nhân viên"}</span>
                  {employee.phone && <span className="block text-[10.5px] text-[var(--color-accent)]">{employee.phone}</span>}
                </span>
              </button>
            );
          })}
          {!filtered.length && <div className="py-10 text-center text-[12px] text-[var(--color-text-light)]">Không tìm thấy nhân viên</div>}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

Expected: no errors; the existing repository warnings may remain.

- [ ] **Step 3: Commit**

Run:

```powershell
git add src/components/org/employee-group-panel.tsx
git commit -m "feat: add searchable employee group panel"
```

### Task 5: Build the department management chart

**Files:**
- Create: `src/components/org/department-management-chart.tsx`

- [ ] **Step 1: Implement the management node renderer**

Create `src/components/org/department-management-chart.tsx` with these top-level types and node behavior:

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, LocateFixed, Pencil, Users } from "lucide-react";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";
import type { CompactDepartmentTreeResult, CompactOrgNode, OrgPerson } from "@/lib/org-hierarchy";
import { ChartConnectorLayer, useChartConnectors, type ConnectorEdge } from "./chart-connector-layer";
import { EmployeeGroupPanel } from "./employee-group-panel";

function collectVisibleEdges(
  node: CompactOrgNode,
  collapsed: Set<number>,
): ConnectorEdge[] {
  if (collapsed.has(node.person.id)) return [];
  return node.children.flatMap((child) => [
    { from: `manager-${node.person.id}`, to: `manager-${child.person.id}` },
    ...collectVisibleEdges(child, collapsed),
  ]);
}
```

The recursive node must:

- render a `190px` readable management card;
- register `manager-${person.id}` with `registerNode`;
- show photo, name, position, and phone;
- call `onSelectEmployee(person)` when clicked;
- show the edit button only when `onEditEmployee` exists;
- render a collapse button when it has management children;
- render an `EmployeeGroupNode` button when `node.employees.length > 0`;
- never render one card per regular employee on the canvas.

Use this complete employee group button:

```tsx
<button
  onClick={() => onOpenEmployees(node.person, node.employees)}
  className="mt-4 flex min-w-[150px] items-center justify-center gap-2 rounded-[9px] border border-dashed border-[var(--color-accent)] bg-white px-4 py-2.5 text-[12px] font-medium text-[var(--color-accent)]"
>
  <Users size={15} />
  {node.employees.length} nhân viên
</button>
```

- [ ] **Step 2: Implement canvas controls and scrolling**

The exported component signature must be:

```tsx
export function DepartmentManagementChart({
  tree,
  onSelectEmployee,
  onEditEmployee,
}: {
  tree: CompactDepartmentTreeResult;
  onSelectEmployee: (person: OrgPerson) => void;
  onEditEmployee?: (person: OrgPerson) => void;
}) { /* implementation */ }
```

Inside it:

- store collapsed manager IDs in `Set<number>`;
- store the opened `{ manager, employees }` group or `null`;
- use a scroll container with `overflow-auto` and `cursor-grab`;
- implement pointer drag by updating `scrollLeft` and `scrollTop`;
- cancel dragging when the pointer starts on `button`, `input`, or `select`;
- calculate connector edges with `collectVisibleEdges`;
- use `scrollIntoView({ block: "start", inline: "center" })` for “Về trung tâm”;
- render “Chưa xác định Trưởng phòng” when `tree.root` is null;
- render `tree.additionalRoots` and `tree.unassigned` in a dashed warning area below the main tree;
- mount `EmployeeGroupPanel` inside the relative chart container.

Use this drag guard:

```ts
if ((event.target as HTMLElement).closest("button,input,select,a")) return;
```

Use a minimum canvas width of `720px`; allow it to grow from management branches, but do not apply CSS `transform: scale(...)`.

- [ ] **Step 3: Run verification**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
```

Expected: tests and typecheck pass; lint has no new errors.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/components/org/department-management-chart.tsx
git commit -m "feat: add compact department management chart"
```

### Task 6: Integrate the new charts into the organization screen

**Files:**
- Modify: `src/components/screens/org-screen.tsx`
- Delete: `src/components/org/org-chart-canvas.tsx`

- [ ] **Step 1: Replace imports and derived state**

In `src/components/screens/org-screen.tsx`:

- remove `buildCompanyHierarchy`;
- remove `OrgChartCanvas`;
- import `buildCompactDepartmentHierarchy`;
- import `CompanyDepartmentChart`;
- import `DepartmentManagementChart`;
- remove `overviewTab` and `companyTree`;
- change `departmentTree` to:

```ts
const departmentTree = useMemo(
  () => activeDepartment
    ? buildCompactDepartmentHierarchy(people, {
        departmentId: activeDepartment.id,
        headEmployeeId: activeDepartment.head_employee_id,
      })
    : null,
  [activeDepartment, people],
);
```

Do not infer a regular employee as department head. `buildCompactDepartmentHierarchy` owns the approved fallback.

- [ ] **Step 2: Replace the overview UI**

Replace the overview tab selector and both old overview bodies with:

```tsx
<CompanyDepartmentChart
  departments={departments}
  onSelectDepartment={(department) => {
    const entry = structure
      .flatMap((block) => block.departments.map((item) => ({ ...item, block: block.block })))
      .find((item) => item.deptId === department.id);
    if (entry) {
      setActiveDept({
        block: entry.block,
        dept: entry.dept,
        staff: entry.staff,
      });
    }
    closePanels();
  }}
/>
```

Keep the heading “Sơ đồ tổng” and the company employee/department counts above it.

- [ ] **Step 3: Replace the department canvas**

Replace the detail `OrgChartCanvas` call with:

```tsx
{departmentTree && (
  <DepartmentManagementChart
    tree={departmentTree}
    onSelectEmployee={(person) =>
      setSelectedEmployee(
        (empData?.data ?? []).find((employee) => employee.id === person.id) ?? null,
      )
    }
    onEditEmployee={canEdit ? setEditingPerson : undefined}
  />
)}
```

Keep the existing department edit button and hierarchy edit modal unchanged.

- [ ] **Step 4: Delete the obsolete canvas**

Delete:

```text
src/components/org/org-chart-canvas.tsx
```

Confirm no references remain:

```powershell
rg -n "OrgChartCanvas|overviewTab|buildCompanyHierarchy" src/components
```

Expected: no matches in components. Keeping `buildCompanyHierarchy` exported in the library is acceptable because its existing tests may still use it; the screen must no longer call it.

- [ ] **Step 5: Expose load errors with retry**

Change both query destructures to retain errors:

```ts
const {
  data: deptData,
  isLoading: deptLoading,
  error: deptError,
  refetch: refetchDepts,
} = useQuery(deptFetcher);
const {
  data: empData,
  isLoading: empLoading,
  error: empError,
  refetch: refetchEmployees,
} = useQuery(empFetcher);
```

Immediately after the loading return, add:

```tsx
const loadError = deptError ?? empError;
if (loadError) {
  return (
    <div className="rounded-[12px] border border-[var(--color-danger)]/30 bg-white p-8 text-center">
      <div className="text-[14px] font-semibold text-[var(--color-danger)]">Không thể tải sơ đồ tổ chức</div>
      <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">{loadError}</div>
      <button
        onClick={() => {
          refetchDepts();
          refetchEmployees();
        }}
        className="mt-4 rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[12px] font-medium text-white"
      >
        Thử lại
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Run automated verification**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
```

Expected: all tests pass, typecheck exits 0, lint reports no errors.

- [ ] **Step 7: Commit integration**

Run:

```powershell
git add src/components/screens/org-screen.tsx src/components/org
git commit -m "feat: integrate compact organization charts"
```

### Task 7: Browser acceptance, documentation, and handoff

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Start the application from the synchronized branch**

Run:

```powershell
npm.cmd run dev
```

Expected: Next.js prints the local URL and the organization screen loads after login.

- [ ] **Step 2: Verify the company overview**

In the browser:

1. Open “Sơ đồ tổ chức”.
2. Confirm “Sơ đồ tổng” shows Ban Giám đốc and department cards only.
3. Confirm every department card shows name and employee count.
4. Resize the browser from wide desktop to tablet width.
5. Confirm cards wrap to new rows, text remains readable, and no page-level horizontal overflow appears.
6. Confirm connector lines remain attached to cards after resize.
7. Click three different departments and confirm each opens the correct detail chart.

- [ ] **Step 3: Verify a large department**

Using QLSX or the largest available department:

1. Confirm Trưởng phòng is the highest node, or Tổ trưởng when no Trưởng phòng is configured.
2. Confirm management nodes show image, name, position, and phone.
3. Confirm regular employees appear as grouped “N nhân viên” nodes.
4. Confirm there is no horizontal row containing every employee.
5. Open an employee group, search by name and position, and open one profile.
6. Confirm the panel closes and reopens without shifting connector endpoints.
7. Confirm drag-to-pan, visible scrollbars, collapse, expand, and “Về trung tâm”.

- [ ] **Step 4: Verify edit behavior**

With HR/Super permission:

1. Move a branch.
2. Insert an existing eligible manager.
3. Remove a management level.
4. Confirm the chart and employee groups recalculate immediately.
5. Reload and confirm the saved relationship remains.
6. Confirm a non-HR/non-Super account does not see edit controls.

- [ ] **Step 5: Verify abnormal data states**

Confirm:

- empty department shows an empty state;
- missing head shows “Chưa xác định Trưởng phòng”;
- unassigned employees remain visible in the warning group;
- the chart does not freeze or omit all employees if a cycle warning exists.

- [ ] **Step 6: Run final automated checks**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
Push-Location api
node.exe ..\node_modules\typescript\bin\tsc --noEmit
Pop-Location
npm.cmd run lint
git diff --check
```

Expected: all tests pass, both typechecks pass, lint has no new errors, and `git diff --check` is clean.

- [ ] **Step 7: Update the handoff**

Append to `docs/HANDOFF.md`:

```md
## Compact organization chart redesign

- Company overview now renders Ban Giám đốc → responsive department cards only.
- Department details start at the configured Trưởng phòng, with a management-role fallback.
- Regular employees are grouped under their direct manager and opened in a searchable side panel.
- Connector lines use measured SVG paths and recalculate after resize or panel changes.
- The chart keeps readable card sizes; large trees use pan and visible scrollbars instead of unreadable zoom.
- Before continuing, fetch the remote branch and compare organization files. Preserve `manager_employee_id` and the existing HR/Super edit constraints.
```

Add the exact test totals and browser scenarios that passed.

- [ ] **Step 8: Commit documentation**

Run:

```powershell
git add docs/HANDOFF.md
git commit -m "docs: hand off compact organization chart"
```

- [ ] **Step 9: Review final scope**

Run:

```powershell
git status --short --branch
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Expected: only task-related commits/files plus the intentional design and plan documents; `.npm-cache/` and `.superpowers/` remain untracked and are not committed.
