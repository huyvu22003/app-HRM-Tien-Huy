# Organization Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add company-wide and per-department management trees, quick-detail popups, and permission-controlled inline hierarchy editing based on existing employee records.

**Architecture:** Store stable reporting lines with `manager_employee_id`, migrate unambiguous legacy manager names, and expose one validated hierarchy-mutation endpoint. Keep tree construction in pure TypeScript, render it through focused client components, and leave `org-screen.tsx` responsible only for data loading and screen-level state.

**Tech Stack:** Next.js 16.2 client components, React 19, TypeScript 5, Tailwind CSS 4, Cloudflare Workers/D1, Vitest, React Testing Library.

---

## File map

**Create**

- `vitest.config.mts`: root unit/component test configuration.
- `src/test/setup.ts`: Testing Library cleanup and DOM matchers.
- `src/lib/org-hierarchy.ts`: pure hierarchy types, normalization, tree building, role classification, candidate filtering, and local operation previews.
- `src/lib/org-hierarchy.test.ts`: hierarchy and operation unit tests.
- `src/components/org/org-chart-canvas.tsx`: recursive top-down tree renderer with zoom controls and horizontal overflow.
- `src/components/org/org-chart-canvas.test.tsx`: canvas interactions and accessible-node tests.
- `src/components/org/org-profile-modals.tsx`: employee and department quick-detail dialogs.
- `src/components/org/org-profile-modals.test.tsx`: dialog content and navigation tests.
- `src/components/org/org-chart-editor.tsx`: action picker, filtered employee/manager selector, impact confirmation, and save state.
- `src/components/org/org-chart-editor.test.tsx`: editing permission, filtering, and confirmation tests.
- `api/src/org-rules.ts`: pure server-side role, cycle, department, and operation validation.
- `api/src/org-rules.test.ts`: server rule tests without D1.
- `api/src/handlers/org.ts`: atomic hierarchy mutation handler.
- `db/migrations/004_employee_manager_relationship.sql`: D1 column, index, and legacy backfill.
- `docs/HANDOFF.md`: synchronization contract and implementation handoff.

**Modify**

- `package.json`: add test scripts and root test dependencies.
- `package-lock.json`: lock new test dependencies.
- `api/src/handlers/employees.ts`: read/write manager IDs and names.
- `api/src/index.ts`: pass authenticated role and route hierarchy mutations.
- `api/package.json`: add typecheck/test convenience scripts.
- `src/lib/api.ts`: extend `ApiEmployee` and add hierarchy mutation client.
- `src/lib/mock-api.ts`: persist demo overrides for base employees and support hierarchy actions.
- `src/components/screens/org-screen.tsx`: add Sơ đồ tổng, two overview tabs, per-department tree, dialogs, and edit mode.
- `docs/superpowers/specs/2026-07-19-organization-hierarchy-design.md`: only if implementation reveals a necessary clarification.

## Task 1: Establish the test harness

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.mts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add the failing smoke test**

Create `src/lib/org-hierarchy.test.ts` with only the import that does not exist yet:

```ts
import { describe, expect, it } from "vitest";
import { normalizePersonName } from "./org-hierarchy";

describe("normalizePersonName", () => {
  it("normalizes whitespace and case for legacy manager matching", () => {
    expect(normalizePersonName("  Hồ   Thị Phương ")).toBe("hồ thị phương");
  });
});
```

- [ ] **Step 2: Install and configure Vitest**

Run:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Create `vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "api/src/**/*.test.ts"],
    css: false,
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [ ] **Step 3: Run the test and verify the production module is missing**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
```

Expected: FAIL because `./org-hierarchy` does not exist.

- [ ] **Step 4: Commit the harness**

```bash
git add package.json package-lock.json vitest.config.mts src/test/setup.ts src/lib/org-hierarchy.test.ts
git commit -m "test: add organization hierarchy test harness"
```

## Task 2: Build the pure hierarchy model

**Files:**

- Create: `src/lib/org-hierarchy.ts`
- Modify: `src/lib/org-hierarchy.test.ts`

- [ ] **Step 1: Replace the smoke test with behavior-first tests**

Use this fixture shape in `src/lib/org-hierarchy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildCompanyHierarchy,
  buildDepartmentHierarchy,
  filterManagerCandidates,
  insertManagerPreview,
  removeManagerPreview,
  type OrgPerson,
} from "./org-hierarchy";

const people: OrgPerson[] = [
  { id: 1, name: "Mr. Trung", departmentId: 1, departmentName: "Ban Giám đốc", position: "Giám đốc", level: "Ban Giám đốc", managerEmployeeId: null, managerName: null, phone: "0901" },
  { id: 2, name: "Ôn Thị Uy Lam", departmentId: 2, departmentName: "Nhân Sự", position: "Trưởng phòng", level: "Trưởng phòng", managerEmployeeId: null, managerName: null, phone: "0902" },
  { id: 3, name: "Nhân viên A", departmentId: 2, departmentName: "Nhân Sự", position: "Nhân viên", level: "Nhân viên", managerEmployeeId: 2, managerName: "Ôn Thị Uy Lam", phone: "0903" },
  { id: 4, name: "Tổ trưởng B", departmentId: 2, departmentName: "Nhân Sự", position: "Tổ trưởng", level: "Tổ trưởng", managerEmployeeId: 2, managerName: "Ôn Thị Uy Lam", phone: "0904" },
  { id: 5, name: "Nhân viên B", departmentId: 2, departmentName: "Nhân Sự", position: "Nhân viên", level: "Nhân viên", managerEmployeeId: 4, managerName: "Tổ trưởng B", phone: "0905" },
];

describe("department hierarchy", () => {
  it("builds manager-to-employee levels", () => {
    const result = buildDepartmentHierarchy(people, { departmentId: 2, headEmployeeId: 2 });
    expect(result.roots[0].person.id).toBe(2);
    expect(result.roots[0].children.map((n) => n.person.id)).toEqual([4, 3]);
    expect(result.roots[0].children[0].children[0].person.id).toBe(5);
    expect(result.unassigned).toEqual([]);
  });

  it("cuts cycles and keeps every person visible", () => {
    const cyclic = people.map((p) =>
      p.id === 2 ? { ...p, managerEmployeeId: 5 } : p,
    );
    const result = buildDepartmentHierarchy(cyclic, { departmentId: 2, headEmployeeId: 2 });
    expect(new Set([...result.roots, ...result.unassigned].flatMap((n) => n.descendantIds.concat(n.person.id))).size).toBe(4);
    expect(result.warnings.some((w) => w.code === "cycle")).toBe(true);
  });
});

describe("company hierarchy", () => {
  it("attaches department heads below the director", () => {
    const result = buildCompanyHierarchy(people, [{ id: 2, headEmployeeId: 2 }]);
    expect(result.roots[0].person.id).toBe(1);
    expect(result.roots[0].children[0].person.id).toBe(2);
  });
});

describe("editing previews", () => {
  it("filters self, descendants, other departments and non-managers", () => {
    expect(filterManagerCandidates(3, people).map((p) => p.id)).toEqual([2, 4]);
  });

  it("inserts a manager between a parent and branch root", () => {
    const preview = insertManagerPreview(people, { candidateId: 4, branchRootId: 3 });
    expect(preview.updates).toEqual([
      { employeeId: 4, managerEmployeeId: 2 },
      { employeeId: 3, managerEmployeeId: 4 },
    ]);
  });

  it("promotes direct reports when removing a management level", () => {
    const preview = removeManagerPreview(people, 4);
    expect(preview.updates).toContainEqual({ employeeId: 5, managerEmployeeId: 2 });
    expect(preview.updates).toContainEqual({ employeeId: 4, managerEmployeeId: 2 });
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
```

Expected: FAIL with missing exported functions and types.

- [ ] **Step 3: Implement the pure model**

Create `src/lib/org-hierarchy.ts` with these public contracts:

```ts
export interface OrgPerson {
  id: number;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  position: string | null;
  level: string | null;
  managerEmployeeId: number | null;
  managerName: string | null;
  phone: string | null;
}

export interface OrgNode {
  person: OrgPerson;
  children: OrgNode[];
  descendantIds: number[];
}

export interface OrgWarning {
  code: "cycle" | "missing-manager" | "ambiguous-manager" | "missing-director";
  employeeId?: number;
}

export interface OrgTreeResult {
  roots: OrgNode[];
  unassigned: OrgNode[];
  warnings: OrgWarning[];
}

export interface RelationshipUpdate {
  employeeId: number;
  managerEmployeeId: number | null;
}

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function isManagementRole(person: Pick<OrgPerson, "position" | "level">): boolean {
  const value = `${person.position ?? ""} ${person.level ?? ""}`.toLocaleLowerCase("vi");
  return /(giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/.test(value);
}
```

Implement `buildDepartmentHierarchy`, `buildCompanyHierarchy`, `filterManagerCandidates`, `insertManagerPreview`, and `removeManagerPreview` as pure functions. Requirements:

- Resolve `managerEmployeeId` first.
- Use a unique normalized legacy `managerName` only when the ID is absent.
- Sort siblings by management role first, then `position`, then `name`, then `id`.
- Track DFS states (`unseen`, `visiting`, `done`) and cut an edge when it points to `visiting`.
- Compute `descendantIds` after children are finalized.
- Never drop a person; invalid roots go to `unassigned`.

- [ ] **Step 4: Run unit tests**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the hierarchy model**

```bash
git add src/lib/org-hierarchy.ts src/lib/org-hierarchy.test.ts
git commit -m "feat: add organization hierarchy model"
```

## Task 3: Add stable manager IDs to D1 and employee reads

**Files:**

- Create: `db/migrations/004_employee_manager_relationship.sql`
- Modify: `api/src/handlers/employees.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add an API-shape test**

Add to `src/lib/org-hierarchy.test.ts` a compile-time fixture used by the UI mapper:

```ts
import { apiEmployeeToOrgPerson } from "./org-hierarchy";

it("maps manager IDs and names from the API", () => {
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
  expect(person.managerEmployeeId).toBe(2);
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
```

Expected: FAIL because `apiEmployeeToOrgPerson` is missing.

- [ ] **Step 3: Add the migration**

Create `db/migrations/004_employee_manager_relationship.sql`:

```sql
ALTER TABLE employees
ADD COLUMN manager_employee_id INTEGER REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_employees_manager
ON employees(manager_employee_id);

UPDATE employees
SET manager_employee_id = (
  SELECT manager_match.id
  FROM employees AS manager_match
  WHERE lower(trim(manager_match.name)) = lower(trim(employees.manager))
    AND manager_match.id <> employees.id
)
WHERE manager_employee_id IS NULL
  AND manager IS NOT NULL
  AND trim(manager) NOT IN ('', '-')
  AND (
    SELECT COUNT(*)
    FROM employees AS candidate
    WHERE lower(trim(candidate.name)) = lower(trim(employees.manager))
      AND candidate.id <> employees.id
  ) = 1;
```

- [ ] **Step 4: Return stable manager fields from employee queries**

Change list/detail selects in `api/src/handlers/employees.ts` to join the manager:

```sql
SELECT e.*, d.name AS department_name, manager_employee.name AS manager_name
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN employees manager_employee ON manager_employee.id = e.manager_employee_id
```

Extend `EmployeeBody` and write maps with:

```ts
managerEmployeeId?: number | null;
```

```ts
manager_employee_id: body.managerEmployeeId,
```

When `managerEmployeeId` is provided, load the manager name and update both `manager_employee_id` and legacy `manager` in the same statement.

- [ ] **Step 5: Extend the client type and mapper**

Add to `ApiEmployee` in `src/lib/api.ts`:

```ts
manager_employee_id: number | null;
manager_name: string | null;
updated_at: string | null;
```

Implement `apiEmployeeToOrgPerson` in `src/lib/org-hierarchy.ts` without importing the browser API module:

```ts
export function apiEmployeeToOrgPerson(employee: {
  id: number;
  name: string;
  department_id: number | null;
  department_name: string | null;
  position: string | null;
  level: string | null;
  manager_employee_id: number | null;
  manager_name?: string | null;
  manager?: string | null;
  phone: string | null;
}): OrgPerson {
  return {
    id: employee.id,
    name: employee.name,
    departmentId: employee.department_id,
    departmentName: employee.department_name,
    position: employee.position,
    level: employee.level,
    managerEmployeeId: employee.manager_employee_id,
    managerName: employee.manager_name ?? employee.manager ?? null,
    phone: employee.phone,
  };
}
```

- [ ] **Step 6: Verify migration and TypeScript**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
npm run typecheck
cd api && npm exec tsc -- --noEmit
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/004_employee_manager_relationship.sql api/src/handlers/employees.ts src/lib/api.ts src/lib/org-hierarchy.ts src/lib/org-hierarchy.test.ts
git commit -m "feat: store employee manager relationships by id"
```

## Task 4: Implement validated atomic hierarchy mutations

**Files:**

- Create: `api/src/org-rules.ts`
- Create: `api/src/org-rules.test.ts`
- Create: `api/src/handlers/org.ts`
- Modify: `api/src/index.ts`
- Modify: `api/package.json`

- [ ] **Step 1: Write server rule tests**

Create `api/src/org-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  assertCanEditHierarchy,
  validateMove,
  type OrgRecord,
} from "./org-rules";

const rows: OrgRecord[] = [
  { id: 1, departmentId: 2, managerEmployeeId: null, position: "Trưởng phòng", level: "Trưởng phòng" },
  { id: 2, departmentId: 2, managerEmployeeId: 1, position: "Tổ trưởng", level: "Tổ trưởng" },
  { id: 3, departmentId: 2, managerEmployeeId: 2, position: "Nhân viên", level: "Nhân viên" },
  { id: 4, departmentId: 3, managerEmployeeId: null, position: "Trưởng phòng", level: "Trưởng phòng" },
];

it("allows only hr and super", () => {
  expect(() => assertCanEditHierarchy("staff")).toThrow("Không có quyền");
  expect(() => assertCanEditHierarchy("hr")).not.toThrow();
});

it("rejects self, descendants, other departments and non-managers", () => {
  expect(() => validateMove(rows, 1, 1)).toThrow();
  expect(() => validateMove(rows, 1, 3)).toThrow();
  expect(() => validateMove(rows, 3, 4)).toThrow();
  expect(() => validateMove(rows, 2, 3)).toThrow();
  expect(validateMove(rows, 3, 1)).toEqual({ employeeId: 3, managerEmployeeId: 1 });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
npm test -- api/src/org-rules.test.ts
```

Expected: FAIL because `org-rules.ts` is missing.

- [ ] **Step 3: Implement pure validation**

Create `api/src/org-rules.ts` with:

```ts
export interface OrgRecord {
  id: number;
  departmentId: number | null;
  managerEmployeeId: number | null;
  position: string | null;
  level: string | null;
}

export function assertCanEditHierarchy(role: string): void {
  if (role !== "super" && role !== "hr") {
    throw new Error("Không có quyền chỉnh sửa sơ đồ");
  }
}

export function isServerManagementRole(row: OrgRecord): boolean {
  return /(giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/i.test(
    `${row.position ?? ""} ${row.level ?? ""}`,
  );
}
```

Add `validateMove`, `validateInsert`, and `buildRemoveLevelUpdates`. They must reject missing records, self-management, cross-department assignment, non-management targets, and any target reachable from the employee through current manager edges.

- [ ] **Step 4: Implement the handler**

Create `api/src/handlers/org.ts` with a discriminated body:

```ts
type HierarchyAction =
  | { action: "move"; employeeId: number; managerEmployeeId: number | null; expectedUpdatedAt?: string }
  | { action: "insert"; candidateId: number; branchRootId: number; expectedUpdatedAt?: string }
  | { action: "remove-level"; employeeId: number; expectedUpdatedAt?: string };
```

Handler requirements:

- Call `assertCanEditHierarchy(role)`.
- Load all `id`, `department_id`, `manager_employee_id`, `position`, `level`, and `updated_at`.
- Validate `expectedUpdatedAt` when provided; return `409` if stale.
- Derive a complete update list with the pure rules.
- Load manager names for every non-null target.
- Use `env.DB.batch()` to update `manager_employee_id`, legacy `manager`, and `updated_at` for all affected employees.
- Insert one `audit_log` row containing the action and update list.
- Return `{ success: true, affectedEmployeeIds }`.

- [ ] **Step 5: Add the authenticated route before generic employee routes**

In `api/src/index.ts`, retain the full auth object:

```ts
let authUser: AuthUser | null = null;
// ...
authUser = await authMiddleware(request, env);
```

Add:

```ts
if (method === "POST" && pathname === "/api/org/hierarchy") {
  return withCors(await updateHierarchy(request, env, authUser!.userId, authUser!.role));
}
```

- [ ] **Step 6: Run tests and API typecheck**

Run:

```bash
npm test -- api/src/org-rules.test.ts
cd api && npm exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/src/org-rules.ts api/src/org-rules.test.ts api/src/handlers/org.ts api/src/index.ts api/package.json
git commit -m "feat: validate organization hierarchy updates"
```

## Task 5: Support hierarchy mutations in the browser API and demo mode

**Files:**

- Modify: `src/lib/api.ts`
- Modify: `src/lib/mock-api.ts`
- Modify: `src/lib/org-hierarchy.test.ts`

- [ ] **Step 1: Add a demo persistence regression test**

Extract and test the pure update application through `applyHierarchyUpdates` in `src/lib/org-hierarchy.ts`:

```ts
it("applies relationship updates without mutating the source", () => {
  const next = applyHierarchyUpdates(people, [{ employeeId: 3, managerEmployeeId: 4 }]);
  expect(next.find((p) => p.id === 3)?.managerEmployeeId).toBe(4);
  expect(people.find((p) => p.id === 3)?.managerEmployeeId).toBe(2);
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
```

Expected: FAIL because `applyHierarchyUpdates` is missing.

- [ ] **Step 3: Add the client request**

In `src/lib/api.ts` add:

```ts
export type HierarchyMutation =
  | { action: "move"; employeeId: number; managerEmployeeId: number | null; expectedUpdatedAt?: string }
  | { action: "insert"; candidateId: number; branchRootId: number; expectedUpdatedAt?: string }
  | { action: "remove-level"; employeeId: number; expectedUpdatedAt?: string };

export function updateHierarchy(data: HierarchyMutation) {
  return api.post<{ success: boolean; affectedEmployeeIds: number[] }>("/org/hierarchy", data);
}
```

- [ ] **Step 4: Make demo base records mutable through overrides**

In `src/lib/mock-api.ts`:

- Add `manager_employee_id`, `manager_name`, and `updated_at` to `ApiEmp`.
- Resolve initial manager IDs from unique normalized names after `baseEmployees` is created.
- Add a localStorage map `hrm_demo_employee_overrides`.
- Make `allEmployees()` merge base records, overrides, and runtime-added records.
- Add a `POST /^\/org\/hierarchy$/` handler that uses the same preview functions as the UI, applies updates to overrides, synchronizes legacy manager names, and persists.
- Reject invalid operations by throwing an `ApiError`-compatible error message.

- [ ] **Step 5: Implement and verify the pure update helper**

Add to `src/lib/org-hierarchy.ts`:

```ts
export function applyHierarchyUpdates(
  people: OrgPerson[],
  updates: RelationshipUpdate[],
): OrgPerson[] {
  const byEmployee = new Map(updates.map((u) => [u.employeeId, u.managerEmployeeId]));
  const names = new Map(people.map((p) => [p.id, p.name]));
  return people.map((person) => {
    if (!byEmployee.has(person.id)) return { ...person };
    const managerEmployeeId = byEmployee.get(person.id) ?? null;
    return {
      ...person,
      managerEmployeeId,
      managerName: managerEmployeeId ? names.get(managerEmployeeId) ?? null : null,
    };
  });
}
```

Run:

```bash
npm test -- src/lib/org-hierarchy.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/lib/mock-api.ts src/lib/org-hierarchy.ts src/lib/org-hierarchy.test.ts
git commit -m "feat: support hierarchy updates in demo mode"
```

## Task 6: Render trees and quick-detail dialogs

**Files:**

- Create: `src/components/org/org-chart-canvas.tsx`
- Create: `src/components/org/org-chart-canvas.test.tsx`
- Create: `src/components/org/org-profile-modals.tsx`
- Create: `src/components/org/org-profile-modals.test.tsx`

- [ ] **Step 1: Write failing canvas tests**

Create `src/components/org/org-chart-canvas.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrgChartCanvas } from "./org-chart-canvas";

const tree = [{
  person: { id: 1, name: "Giám đốc", departmentId: 1, departmentName: "Ban Giám đốc", position: "Giám đốc", level: "Giám đốc", managerEmployeeId: null, managerName: null, phone: "0901" },
  children: [],
  descendantIds: [],
}];

it("renders an accessible employee node and opens it", () => {
  const onSelect = vi.fn();
  render(<OrgChartCanvas roots={tree} unassigned={[]} onSelectEmployee={onSelect} showManagementPhones />);
  fireEvent.click(screen.getByRole("button", { name: /Giám đốc, Giám đốc/i }));
  expect(onSelect).toHaveBeenCalledWith(tree[0].person);
  expect(screen.getByText("0901")).toBeInTheDocument();
});

it("changes zoom and restores fit", () => {
  render(<OrgChartCanvas roots={tree} unassigned={[]} onSelectEmployee={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
  expect(screen.getByTestId("org-chart-stage")).toHaveAttribute("data-scale", "1.1");
  fireEvent.click(screen.getByRole("button", { name: "Vừa màn hình" }));
  expect(screen.getByTestId("org-chart-stage")).toHaveAttribute("data-scale", "1");
});
```

- [ ] **Step 2: Write failing popup tests**

Create `src/components/org/org-profile-modals.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DepartmentInfoModal, EmployeeQuickProfileModal } from "./org-profile-modals";

const employee = {
  id: 3,
  code: "NV003",
  name: "Nhân viên A",
  gender: null,
  dob: null,
  phone: "0903",
  cccd: null,
  address: null,
  email: "a@tienhuy.vn",
  department_id: 2,
  department_name: "Nhân Sự",
  position: "Nhân viên",
  workplace: null,
  contract_type: null,
  contract_end: null,
  join_date: null,
  resign_request_date: null,
  resign_date: null,
  status: "Đang làm việc",
  manager: "Ôn Thị Uy Lam",
  manager_employee_id: 2,
  manager_name: "Ôn Thị Uy Lam",
  level: "Nhân viên",
  photo_url: null,
  bank: null,
  tax_code: null,
  updated_at: "2026-07-19 10:00:00",
};

it("shows the approved employee fields and opens the full profile", () => {
  const onView = vi.fn();
  render(
    <EmployeeQuickProfileModal
      employee={employee}
      onClose={() => {}}
      onViewFullProfile={onView}
    />,
  );
  expect(screen.getByRole("dialog", { name: /Nhân viên A/ })).toBeInTheDocument();
  expect(screen.getByText("NV003")).toBeInTheDocument();
  expect(screen.getByText("0903")).toBeInTheDocument();
  expect(screen.getByText("a@tienhuy.vn")).toBeInTheDocument();
  expect(screen.queryByText(/CCCD/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Xem hồ sơ đầy đủ" }));
  expect(onView).toHaveBeenCalledWith(3);
});

it("shows department members and opens its chart", () => {
  const onView = vi.fn();
  render(
    <DepartmentInfoModal
      department={{ id: 2, name: "Nhân Sự", block: "Khối Văn phòng", block_color: "#000", head_employee_id: 2, parent_id: null, employee_count: 1 }}
      employees={[employee]}
      head={employee}
      onClose={() => {}}
      onViewDepartment={onView}
    />,
  );
  expect(screen.getByRole("dialog", { name: /Nhân Sự/ })).toBeInTheDocument();
  expect(screen.getByText("Khối Văn phòng")).toBeInTheDocument();
  expect(screen.getByText("Nhân viên A")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Xem sơ đồ phòng ban" }));
  expect(onView).toHaveBeenCalledWith(2);
});

it("closes an employee dialog with Escape", () => {
  const onClose = vi.fn();
  render(<EmployeeQuickProfileModal employee={employee} onClose={onClose} onViewFullProfile={() => {}} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 3: Run component tests**

Run:

```bash
npm test -- src/components/org
```

Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement the canvas**

`OrgChartCanvas` props:

```ts
interface OrgChartCanvasProps {
  roots: OrgNode[];
  unassigned: OrgNode[];
  onSelectEmployee: (person: OrgPerson) => void;
  selectedEmployeeId?: number | null;
  editMode?: boolean;
  onEditEmployee?: (person: OrgPerson) => void;
  showManagementPhones?: boolean;
}
```

Implementation requirements:

- Render recursive semantic `<ul>/<li>` levels.
- Draw connectors with node-level pseudo-elements or nested border lines.
- Use `getEmployeePhoto`, falling back to `getInitials`.
- Show phone only when `showManagementPhones && isManagementRole(person)`.
- Keep controls as labeled buttons: **Thu nhỏ**, **Phóng to**, **Vừa màn hình**.
- Clamp scale to `0.6..1.4` in `0.1` increments.
- Put scaling on an inner stage; keep an outer `overflow-x-auto` container.
- Render **Chưa xác định quản lý** as a labeled secondary section, not as a fake employee.

- [ ] **Step 5: Implement the dialogs**

`EmployeeQuickProfileModal` accepts the selected `ApiEmployee`, `onClose`, and `onViewFullProfile`.

`DepartmentInfoModal` accepts `ApiDepartment`, its `ApiEmployee[]`, the resolved head, `onClose`, and `onViewDepartment`.

Both dialogs must:

- use `role="dialog"` and `aria-modal="true"`;
- close on backdrop and Escape;
- stop propagation inside the panel;
- avoid salary, insurance, CCCD, bank, and tax data;
- fit narrow screens with `max-h` and vertical scrolling.

- [ ] **Step 6: Run component tests and typecheck**

Run:

```bash
npm test -- src/components/org
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/org/org-chart-canvas.tsx src/components/org/org-chart-canvas.test.tsx src/components/org/org-profile-modals.tsx src/components/org/org-profile-modals.test.tsx
git commit -m "feat: render organization charts and profile dialogs"
```

## Task 7: Add inline editing and integrate the organization screen

**Files:**

- Create: `src/components/org/org-chart-editor.tsx`
- Create: `src/components/org/org-chart-editor.test.tsx`
- Modify: `src/components/screens/org-screen.tsx`

- [ ] **Step 1: Write editor tests**

Create `src/components/org/org-chart-editor.test.tsx` with fixtures that verify:

```tsx
it("shows only valid managers for đổi quản lý", async () => {
  render(
    <OrgChartEditor
      open
      action="move"
      selected={employee}
      employees={employees}
      onActionChange={() => {}}
      onCancel={() => {}}
      onConfirm={vi.fn()}
      saving={false}
    />,
  );
  expect(screen.getByRole("option", { name: "Ôn Thị Uy Lam — Trưởng phòng" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Nhân viên B/ })).not.toBeInTheDocument();
});

it("states the affected direct-report count before removing a level", () => {
  render(/* remove-level props for a manager with two direct reports */);
  expect(screen.getByText(/2 cấp dưới trực tiếp sẽ chuyển lên/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/components/org/org-chart-editor.test.tsx
```

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Implement `OrgChartEditor`**

Use these action values:

```ts
export type OrgEditAction = "add-report" | "insert-manager" | "move" | "remove-level";
```

Requirements:

- Select only existing employees.
- For add-report and move, use `filterManagerCandidates`.
- For insert-manager, filter management roles in the same department, excluding the branch and descendants.
- Show current manager, proposed manager, and direct-report impact.
- Require a final **Xác nhận thay đổi** click.
- Call `onConfirm(HierarchyMutation)` with the selected employee’s `updated_at`.
- Keep the dialog open and show an inline error when saving fails.

- [ ] **Step 4: Replace the flat employee grid in `org-screen.tsx`**

Screen state must include:

```ts
type OrgSelection =
  | { kind: "overview" }
  | { kind: "department"; departmentId: number };

type OverviewTab = "people" | "departments";
```

Integration requirements:

- Add **Sơ đồ tổng** before the first block in the left card.
- Keep block expansion and department editing behavior.
- Select overview by default.
- The overview header has two tabs: **Nhân sự toàn công ty** and **Phòng ban**.
- People tab uses `buildCompanyHierarchy`.
- Department tab renders Ban Giám đốc as the root and all departments as clickable children.
- Department selection uses `buildDepartmentHierarchy`.
- Clicking an employee opens `EmployeeQuickProfileModal`.
- Clicking a department node opens `DepartmentInfoModal`.
- **Xem sơ đồ phòng ban** changes selection instead of reloading the page.
- HR/Super sees **Chỉnh sửa sơ đồ**; edit actions are absent for other roles.
- A successful `updateHierarchy` refetches employees, rebuilds the tree, closes the editor, and shows a short success state.
- Changing selection/tab closes employee/department/editor dialogs.
- Preserve current add/edit/delete department features.

- [ ] **Step 5: Run editor and hierarchy tests**

Run:

```bash
npm test -- src/components/org src/lib/org-hierarchy.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Run lint and fix only task-related errors**

Run:

```bash
npm run lint
```

Expected: PASS, or only pre-existing warnings documented in the handoff.

- [ ] **Step 7: Commit**

```bash
git add src/components/org/org-chart-editor.tsx src/components/org/org-chart-editor.test.tsx src/components/screens/org-screen.tsx
git commit -m "feat: integrate editable organization hierarchy"
```

## Task 8: Verify the complete feature and write the handoff

**Files:**

- Create: `docs/HANDOFF.md`
- Modify: implementation files only if verification finds defects

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
cd api && npm exec tsc -- --noEmit
```

Expected: every command exits `0`.

- [ ] **Step 2: Validate the migration against a disposable local D1 database**

Run from `api/`:

```bash
npx wrangler d1 execute hrm-tien-huy-db --local --file=../db/migrations/001_initial.sql
npx wrangler d1 execute hrm-tien-huy-db --local --file=../db/migrations/004_employee_manager_relationship.sql
```

Expected: both migrations complete successfully; the second adds the manager column and index without SQL errors.

- [ ] **Step 3: Perform the browser acceptance pass**

Start:

```bash
npm run dev
```

Verify:

1. **Sơ đồ tổng** appears above Ban Giám đốc.
2. Both overview tabs switch correctly.
3. Company tree starts at Giám đốc and department heads appear below.
4. Selecting QLSX shows Hồ Thị Phương above Bùi Thị Khánh.
5. Employee and department popups show only approved fields.
6. Zoom and horizontal overflow work at desktop and narrow widths.
7. Staff cannot see edit controls.
8. HR can add a report, insert a manager, move a branch, and remove a level.
9. Invalid self/descendant/cross-department choices never appear.
10. Reloading preserves demo-mode hierarchy changes.

- [ ] **Step 4: Write `docs/HANDOFF.md`**

Include exactly these sections:

```md
# Handoff

## Synchronization
- Base remote commit: `49e21c58127baac51f6775066abe07733873c5f5`
- Design commit: `c5d7e80aee34aed773e9831e6d565f67032cb56a`
- Implementation head: record the exact output of `git rev-parse HEAD` immediately before the handoff commit.

## Organization hierarchy
- Summary of delivered behavior.
- Migration: `db/migrations/004_employee_manager_relationship.sql`
- API route: `POST /api/org/hierarchy`
- Files changed.

## Verification
- Exact commands and their exit results.
- Manual browser cases completed.

## Continuation notes
- Apply migration 004 before enabling writes against production D1.
- Do not replace `manager_employee_id` with name-based links.
- Keep employee creation and position changes in the employee module.
- Remaining known issues, or `None`.
```

- [ ] **Step 5: Confirm no generated visual-companion files will be committed**

Run:

```bash
git status --short
git diff --check
```

Expected: `.superpowers/` remains untracked/ignored and is not staged; only `docs/HANDOFF.md` or task-related fixes are pending.

- [ ] **Step 6: Commit the handoff**

```bash
git add docs/HANDOFF.md
git commit -m "docs: hand off organization hierarchy work"
```

- [ ] **Step 7: Final verification after the last commit**

Run:

```bash
git status --short --branch
git log --oneline -8
npm test
npm run build
```

Expected: branch is clean except the untracked `.superpowers/` visual-companion session; tests and build pass.
