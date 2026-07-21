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

## Compact organization chart redesign

### Delivered behavior

- Reworked the company overview into a compact, responsive organization chart while preserving direct department selection, the department information button, and the existing chart controls.
- Department charts keep management relationships visible and group regular leaf employees beneath their nearest visible manager. Employee groups open a full-width panel with a searchable employee list.
- The Phay CNC acceptance case shows 14 staff: root `Nguyễn Văn Thiện` (`Tổ trưởng`), child `Phạm Bá Công` (`Tổ phó`), one connector, and 12 grouped leaf employees. The employee panel lists all 12 employees; searching for `Cao Quốc` filters the list to `Cao Quốc Dũng`. Collapsing all leaves leaves only the root and zero connectors.
- The final width-containment fix is commit `163a8cd` (`min-w-0` containment). Before the fix, the default viewport overflowed to a `scrollWidth` of 1636 px.

### Browser acceptance evidence

- Default viewport: 1271 px document client width; overview rendered 24 cards, 23 SVG connector paths, and 13 rows including the root. After `163a8cd`, document `scrollWidth == clientWidth` at 1271 px and main `scrollWidth == clientWidth` at 1025 px.
- Responsive 900 px viewport: document `scrollWidth == clientWidth` at 891 px and main width was 891 px; the overview rendered 24 cards in 9 rows with readable card widths of 240/245 px. The viewport was reset after this check.
- Phay CNC: verified the 14-person hierarchy, one connector, 12 grouped leaves, full employee-panel list, `Cao Quốc` search result, and collapsed state described above.
- Verified direct department selection, the information button, and chart controls are present.

### Verification (2026-07-21)

- `npm.cmd test`: passed 20/20 tests in 8 suites; 0 failed, 0 cancelled, 0 skipped, 0 todo. Node emitted one `MODULE_TYPELESS_PACKAGE_JSON` performance warning for `src/lib/org-chart-layout.test.ts`.
- `npm.cmd run typecheck`: passed with no diagnostics.
- Backend TypeScript from `api/`: `node.exe ..\\..\\..\\api\\node_modules\\typescript\\bin\\tsc --noEmit --typeRoots ..\\..\\..\\api\\node_modules` passed with no diagnostics. The explicit `typeRoots` points to the available backend dependencies outside this deep worktree.
- `npm.cmd run lint`: exited successfully with 0 errors and 6 warnings: one `import/no-anonymous-default-export` warning in `api/src/index.ts`, four `@next/next/no-img-element` warnings across `app-shell.tsx`, `dashboard-screen.tsx`, and `login-screen.tsx` (two), and one `react-hooks/exhaustive-deps` warning in `employees-screen.tsx`.
- `git diff --check`: passed with no whitespace errors before this handoff edit; rerun after the documentation commit as the final cleanliness check.

### Development environment notes

- Turbopack fails on Windows path length in this deep worktree. Browser acceptance therefore used `next dev --webpack`.
- One Next manifest became corrupted during HMR; deleting the worktree `.next` directory and restarting cleanly resolved it. This was an environment/cache condition, not application behavior.
- Do not commit generated `.npm-cache/`, `.superpowers/`, or `dev-*.out` / `dev-*.err` files.

### Synchronization before push or PR

- This branch began from ancestor `87ff` plus the design and plan work. GitHub `main` was at `c2c6e13` and already ahead with other commits.
- Fetch and reconcile the latest `main` before pushing or opening a PR. Do not overwrite concurrent organization-chart files while resolving differences.
- Preserve the stable `manager_employee_id` hierarchy model and HR/Super authorization checks during reconciliation.
