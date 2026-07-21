import type { Env } from "../middleware/auth";
import { error, json, readJson } from "../utils";

type HierarchyAction =
  | { action: "move"; employeeId: number; managerEmployeeId: number | null; expectedUpdatedAt?: string | null }
  | { action: "insert"; candidateId: number; branchRootId: number; expectedUpdatedAt?: string | null }
  | { action: "remove-level"; employeeId: number; expectedUpdatedAt?: string | null };

interface EmployeeRow {
  id: number;
  department_id: number | null;
  manager_employee_id: number | null;
  position: string | null;
  level: string | null;
  updated_at: string | null;
}

function isManager(row: EmployeeRow): boolean {
  return /(giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/i.test(
    `${row.position ?? ""} ${row.level ?? ""}`,
  );
}

function descendants(employeeId: number, rows: EmployeeRow[]): Set<number> {
  const result = new Set<number>();
  const queue = [employeeId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const row of rows) {
      if (row.manager_employee_id === parent && !result.has(row.id)) {
        result.add(row.id);
        queue.push(row.id);
      }
    }
  }
  return result;
}

export async function updateHierarchy(
  request: Request,
  env: Env,
  userId: number,
  role: string,
): Promise<Response> {
  if (role !== "super" && role !== "hr") return error("Không có quyền chỉnh sửa sơ đồ", 403);
  const input = await readJson<HierarchyAction>(request);
  const { results } = await env.DB.prepare(
    "SELECT id, department_id, manager_employee_id, position, level, updated_at FROM employees",
  ).all<EmployeeRow>();
  const rows = results as EmployeeRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const updates: Array<{ employeeId: number; managerEmployeeId: number | null }> = [];

  const validateManager = (employee: EmployeeRow, managerId: number | null) => {
    if (managerId === null) return;
    const manager = byId.get(managerId);
    if (!manager) throw new Error("Không tìm thấy người quản lý");
    if (employee.id === manager.id) throw new Error("Nhân viên không thể tự quản lý");
    if (employee.department_id !== manager.department_id) throw new Error("Người quản lý phải cùng phòng ban");
    if (!isManager(manager)) throw new Error("Chức vụ được chọn không thuộc cấp quản lý");
    if (descendants(employee.id, rows).has(manager.id)) throw new Error("Không thể chọn cấp dưới làm quản lý");
  };

  if (input.action === "move") {
    const employee = byId.get(input.employeeId);
    if (!employee) return error("Không tìm thấy nhân viên", 404);
    validateManager(employee, input.managerEmployeeId);
    if (input.expectedUpdatedAt && employee.updated_at !== input.expectedUpdatedAt) return error("Sơ đồ đã thay đổi, vui lòng tải lại", 409);
    updates.push({ employeeId: employee.id, managerEmployeeId: input.managerEmployeeId });
  } else if (input.action === "insert") {
    const candidate = byId.get(input.candidateId);
    const branch = byId.get(input.branchRootId);
    if (!candidate || !branch) return error("Không tìm thấy nhân viên", 404);
    if (!isManager(candidate)) return error("Chức vụ được chọn không thuộc cấp quản lý", 400);
    if (candidate.department_id !== branch.department_id) return error("Người quản lý phải cùng phòng ban", 400);
    validateManager(candidate, branch.manager_employee_id);
    validateManager(branch, candidate.id);
    updates.push(
      { employeeId: candidate.id, managerEmployeeId: branch.manager_employee_id },
      { employeeId: branch.id, managerEmployeeId: candidate.id },
    );
  } else if (input.action === "remove-level") {
    const employee = byId.get(input.employeeId);
    if (!employee) return error("Không tìm thấy nhân viên", 404);
    for (const row of rows.filter((row) => row.manager_employee_id === employee.id)) {
      updates.push({ employeeId: row.id, managerEmployeeId: employee.manager_employee_id });
    }
    updates.push({ employeeId: employee.id, managerEmployeeId: employee.manager_employee_id });
  } else {
    return error("Thao tác sơ đồ không hợp lệ", 400);
  }

  const statements = updates.map((update) =>
    env.DB.prepare(
      `UPDATE employees
       SET manager_employee_id = ?,
           manager = (SELECT name FROM employees WHERE id = ?),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(update.managerEmployeeId, update.managerEmployeeId, update.employeeId),
  );
  statements.push(
    env.DB.prepare(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, after_data)
       VALUES (?, 'update_hierarchy', 'employees', ?, ?)`,
    ).bind(userId, updates.map((update) => update.employeeId).join(","), JSON.stringify(input)),
  );
  await env.DB.batch(statements);
  return json({ success: true, affectedEmployeeIds: updates.map((update) => update.employeeId) });
}
