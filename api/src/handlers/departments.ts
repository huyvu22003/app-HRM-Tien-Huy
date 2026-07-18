import type { Env } from "../middleware/auth";
import { json, error, readJson } from "../utils";

// Canonical top-down block order for display
const BLOCK_ORDER_CASE = `CASE d.block
  WHEN 'Khối Điều hành' THEN 1
  WHEN 'Khối Văn phòng' THEN 2
  WHEN 'Khối Kỹ thuật & QC' THEN 3
  WHEN 'Khối Sản xuất' THEN 4
  WHEN 'Khối Hỗ trợ & Kho' THEN 5
  ELSE 9 END`;

export async function listDepartments(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.name, d.block, d.block_color, d.head_employee_id, d.parent_id,
            COUNT(e.id) as employee_count
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Đang làm việc'
     GROUP BY d.id
     ORDER BY ${BLOCK_ORDER_CASE}, d.id`
  ).all();

  return json({ data: results });
}

interface DepartmentBody {
  name?: string;
  block?: string;
  blockColor?: string;
  headEmployeeId?: number | null;
  parentId?: number | null;
}

export async function createDepartment(request: Request, env: Env): Promise<Response> {
  const body = await readJson<DepartmentBody>(request);
  if (!body.name || !body.name.trim()) return error("Thiếu tên phòng ban", 400);
  if (!body.block || !body.block.trim()) return error("Thiếu khối", 400);

  const existing = await env.DB.prepare("SELECT id FROM departments WHERE name = ?")
    .bind(body.name.trim())
    .first();
  if (existing) return error("Phòng ban đã tồn tại", 409);

  const result = await env.DB.prepare(
    `INSERT INTO departments (name, block, block_color, head_employee_id, parent_id)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      body.name.trim(),
      body.block.trim(),
      body.blockColor ?? "#1e6fd0",
      body.headEmployeeId ?? null,
      body.parentId ?? null
    )
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function updateDepartment(request: Request, env: Env, id: string): Promise<Response> {
  const body = await readJson<DepartmentBody>(request);

  const existing = await env.DB.prepare("SELECT * FROM departments WHERE id = ?").bind(id).first();
  if (!existing) return error("Không tìm thấy phòng ban", 404);

  const fields: string[] = [];
  const args: unknown[] = [];
  const map: Record<string, unknown> = {
    name: body.name,
    block: body.block,
    block_color: body.blockColor,
    head_employee_id: body.headEmployeeId,
    parent_id: body.parentId,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      args.push(value);
    }
  }
  if (fields.length === 0) return json({ success: true, unchanged: true });

  args.push(id);
  await env.DB.prepare(`UPDATE departments SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...args)
    .run();

  return json({ success: true });
}

export async function deleteDepartment(_request: Request, env: Env, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM departments WHERE id = ?").bind(id).first();
  if (!existing) return error("Không tìm thấy phòng ban", 404);

  const inUse = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM employees WHERE department_id = ?"
  )
    .bind(id)
    .first<{ c: number }>();
  if ((inUse?.c ?? 0) > 0) {
    return error("Không thể xóa: vẫn còn nhân viên thuộc phòng ban này", 400);
  }

  await env.DB.prepare("DELETE FROM departments WHERE id = ?").bind(id).run();
  return json({ success: true });
}
