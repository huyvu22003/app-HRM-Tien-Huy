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

## Custom fields — server-side persistence (2026-07-24)

Cột tùy chỉnh (user-defined columns) của danh sách nhân viên đã được chuyển
sang lưu ở máy chủ để không mất khi đăng xuất / đổi trình duyệt / đổi máy.

Migration:

- Apply `db/migrations/005_custom_fields.sql` before enabling writes against production D1.
- Tạo bảng `custom_fields` (định nghĩa cột, dùng chung toàn công ty) và
  `employee_custom_values` (giá trị theo từng nhân viên).

API:

- `GET/POST /api/custom-fields`, `DELETE /api/custom-fields/:id`
- `GET /api/custom-fields/values`
- `PUT /api/employees/:id/custom-values`

Kích hoạt lưu máy chủ (bước hạ tầng còn lại):

1. Tạo D1 thật và thay `database_id = "placeholder-replace-after-create"`
   trong `wrangler.toml` + `api/wrangler.toml`.
2. Áp dụng toàn bộ migration 001→005.
3. Deploy Worker API (`api/`) và trỏ `NEXT_PUBLIC_API_URL` của site về Worker.
   Khi chưa deploy, ứng dụng chạy demo và `mock-api` phục vụ các route trên
   bằng localStorage (chỉ bền trong cùng trình duyệt + cùng địa chỉ web).

Primary files:

- `src/lib/custom-fields.ts` (client cache + gọi API)
- `src/lib/api.ts` (client functions)
- `src/lib/mock-api.ts` (demo fallback)
- `api/src/handlers/custom-fields.ts`
- `db/migrations/005_custom_fields.sql`

## Earlier hierarchy verification (2026-07-19, before compact redesign)

Completed:

- `npm.cmd test`: 8 passed, 0 failed.
- `node.exe node_modules/typescript/bin/tsc --noEmit`: passed.
- `node.exe ../node_modules/typescript/bin/tsc --noEmit` from `api/`: passed.
- Task-file ESLint: passed with no task-related warning; only the pre-existing anonymous-default-export warning remains in `api/src/index.ts` during the broader API lint.
- `next build`: application bundle compiled successfully.

Historical environment limitation for that verification run:

- During the 2026-07-19 managed-sandbox run, child-process creation failed with `spawn EPERM`.
- In that earlier environment, Vitest/esbuild could not start, so core logic tests used Node 24's native test runner with `--test-isolation=none`.
- In that earlier run, `next build` reached “Compiled successfully” and was then blocked when Next started its TypeScript worker. TypeScript was verified separately with `tsc --noEmit`.
- These historical limitations do not describe the later compact-redesign browser acceptance; current development-server behavior is documented below.

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
- Department-head selection uses a configured `head_employee_id` first, then a unique employee with the highest-ranked management role. An equal-rank ambiguity remains unconfigured rather than selecting an arbitrary head.
- Connectors are measured SVG paths and are recalculated after viewport resize, panel changes, and other layout changes. Cards retain readable fixed widths; pan and visible overflow scrollbars handle large charts instead of shrinking them with unreadable zoom.
- The Phay CNC acceptance case shows 14 staff: root `Nguyễn Văn Thiện` (`Tổ trưởng`), child `Phạm Bá Công` (`Tổ phó`), one connector, and 12 grouped leaf employees. The employee panel lists all 12 employees; searching for `Cao Quốc` filters the list to `Cao Quốc Dũng`. Collapsing all leaves leaves only the root and zero connectors.
- The final width-containment fix is commit `163a8cd` (`min-w-0` containment). Before the fix, the default viewport overflowed to a `scrollWidth` of 1636 px.

### Browser acceptance evidence

- Default viewport: 1271 px document client width; overview rendered 24 cards, 23 SVG connector paths, and 13 rows including the root. After `163a8cd`, document `scrollWidth == clientWidth` at 1271 px and main `scrollWidth == clientWidth` at 1025 px.
- Responsive 900 px viewport: after setting the viewport to 900 px, the root measured correctly; document `scrollWidth == clientWidth` at 891 px and main width was 891 px. The overview rendered 24 cards in 9 rows with readable card widths of 240/245 px and 23 SVG connector paths. All connectors were reattached/recomputed and none contained invalid `NaN` or `Infinity` coordinates. The viewport was reset after this check.
- Phay CNC: verified the 14-person hierarchy, one connector, 12 grouped leaves, full employee-panel list, `Cao Quốc` search result, and collapsed state described above.
- Verified direct department selection, the information button, and chart controls are present.

### Verification (2026-07-21)

- `npm.cmd test`: passed 20/20 tests in 8 suites; 0 failed, 0 cancelled, 0 skipped, 0 todo. Node emitted one `MODULE_TYPELESS_PACKAGE_JSON` performance warning for `src/lib/org-chart-layout.test.ts`.
- `npm.cmd run typecheck`: passed with no diagnostics.
- Backend TypeScript from `api/`: `node.exe ..\\..\\..\\api\\node_modules\\typescript\\bin\\tsc --noEmit --typeRoots ..\\..\\..\\api\\node_modules` passed with no diagnostics. The explicit `typeRoots` points to the available backend dependencies outside this deep worktree.
- `npm.cmd run lint`: exited successfully with 0 errors and 6 warnings: one `import/no-anonymous-default-export` warning in `api/src/index.ts`, four `@next/next/no-img-element` warnings across `app-shell.tsx`, `dashboard-screen.tsx`, and `login-screen.tsx` (two), and one `react-hooks/exhaustive-deps` warning in `employees-screen.tsx`.
- `git diff --check`: final post-documentation and post-commit verification was clean, with no whitespace errors.

### Development environment notes

- Turbopack fails on Windows path length in this deep worktree, but `next dev --webpack` works and was used successfully for browser acceptance.
- One Next manifest became corrupted during HMR; deleting the worktree `.next` directory and restarting cleanly resolved it. This was an environment/cache condition, not application behavior.
- Do not commit generated `.npm-cache/`, `.superpowers/`, or `dev-*.out` / `dev-*.err` files.

### Synchronization before push or PR

- This branch began from ancestor `87ff` plus the design and plan work. GitHub `main` was at `c2c6e13` and already ahead with other commits.
- Fetch and reconcile the latest `main` before pushing or opening a PR. Do not overwrite concurrent organization-chart files while resolving differences.
- Preserve the stable `manager_employee_id` hierarchy model and HR/Super authorization checks during reconciliation.
- Preserve department-head resolution semantics: configured `head_employee_id` first, unique highest management-role fallback second, and no inferred head when the best-ranked candidates are tied.
- Preserve measured SVG connector recalculation after resize, panel, or layout changes, along with fixed readable card widths, panning, and visible overflow scrollbars.
