import type { Env } from "../middleware/auth";
import { json } from "../utils";

export async function listDepartments(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.name, d.block, d.block_color, d.head_employee_id, d.parent_id,
            COUNT(e.id) as employee_count
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Đang làm việc'
     GROUP BY d.id
     ORDER BY d.block, d.name`
  ).all();

  return json({ data: results });
}
