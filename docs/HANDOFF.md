# Handoff

## Synchronization

- Remote branch checked before implementation: `claude/serene-shannon-u01sqc`
- Base remote commit: `49e21c58127baac51f6775066abe07733873c5f5`
- Design commit: `c5d7e80aee34aed773e9831e6d565f67032cb56a`
- Plan commit: `4d68f27dca78aa3c5fcf4dd8625d9aa8aa494ac4`
- Hierarchy model/API commit: `2cfef7a`
- Organization UI commit: `ee1e1e2`

Before continuing, fetch the remote branch and compare it with this implementation head. Do not overwrite concurrent changes to `org-screen.tsx`, `src/lib/api.ts`, `src/lib/mock-api.ts`, or the employee API handlers.

## Organization hierarchy

Delivered behavior:

- Added **Sơ đồ tổng** above the organization blocks.
- Added company people and department overview tabs.
- Added top-down per-department management charts.
- Employee nodes show photo, name, and position; management nodes show phone in the company chart.
- Employee and department nodes open quick-detail dialogs.
- HR/Super can move a branch, insert an existing management employee, or remove a management level.
- Manager selectors are restricted to existing employees with management positions in the same department and exclude descendants.
- Demo-mode hierarchy changes persist in localStorage.
- Added stable `manager_employee_id` support for the real API.

Migration:

- Apply `db/migrations/004_employee_manager_relationship.sql` before enabling writes against production D1.
- The migration adds `employees.manager_employee_id`, creates its index, and backfills only unique legacy name matches.

API:

- `POST /api/org/hierarchy`
- Supported actions: `move`, `insert`, and `remove-level`.
- Server enforces HR/Super permission, same-department management, management-position eligibility, and cycle prevention.

Primary files:

- `src/lib/org-hierarchy.ts`
- `src/components/org/org-chart-canvas.tsx`
- `src/components/org/org-profile-modals.tsx`
- `src/components/screens/org-screen.tsx`
- `src/lib/mock-api.ts`
- `api/src/handlers/org.ts`
- `api/src/handlers/employees.ts`
- `db/migrations/004_employee_manager_relationship.sql`

## Verification

Completed:

- `npm.cmd test`: 8 passed, 0 failed.
- `node.exe node_modules/typescript/bin/tsc --noEmit`: passed.
- `node.exe ../node_modules/typescript/bin/tsc --noEmit` from `api/`: passed.
- Task-file ESLint: passed with no task-related warning; only the pre-existing anonymous-default-export warning remains in `api/src/index.ts` during the broader API lint.
- `next build`: application bundle compiled successfully.

Environment limitation:

- The managed Windows sandbox blocks child process creation with `spawn EPERM`.
- Vitest/esbuild cannot start inside this sandbox, so core logic tests use Node 24's native test runner with `--test-isolation=none`.
- `next build` reaches “Compiled successfully” and then is blocked when Next starts its TypeScript worker. TypeScript was therefore verified separately with `tsc --noEmit`.
- The dev server is blocked by the same child-process restriction, so browser acceptance must be run in a normal terminal after checkout.

## Continuation notes

- Keep employee creation and position changes in the employee module; the chart only selects existing employees.
- Do not replace `manager_employee_id` with name-based links.
- Apply migration 004 before testing the real backend.
- Run `npm install` after pulling because test dependencies and `exceljs` are present in the lockfile.
- Run the browser acceptance list in `docs/superpowers/plans/2026-07-19-organization-hierarchy.md`, especially QLSX, popup content, role visibility, and all three edit actions.
- `.superpowers/` and `.npm-cache/` are local generated directories and must not be committed.
