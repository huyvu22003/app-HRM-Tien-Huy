import type { Env } from "./middleware/auth";
import { authMiddleware } from "./middleware/auth";
import { corsHeaders, handlePreflight } from "./middleware/cors";
import { error, parseIdFromPath } from "./utils";
import { ensureSchema } from "./migrate";

import { login, logout, me } from "./handlers/auth";
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, importEmployees } from "./handlers/employees";
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./handlers/departments";
import { listAttendance, updateAttendance, importAttendance, listAttendancePeriods } from "./handlers/attendance";
import { listOvertimeDaily, saveOvertimeDaily } from "./handlers/overtime";
import {
  listLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  getLeaveBalance,
} from "./handlers/leave";
import { getSalary } from "./handlers/salary";
import { getKpi, createKpi, updateKpi, signKpi } from "./handlers/kpi";
import {
  listRewards,
  createReward,
  updateReward,
  listImprovementPlans,
  createImprovementPlan,
} from "./handlers/recognition";
import { getConfig, updateConfig } from "./handlers/config";
import { getPermissions, updatePermissions } from "./handlers/permissions";
import { uploadFile, downloadFile, uploadAvatar, serveAvatar } from "./handlers/files";
import { updateHierarchy } from "./handlers/org";
import {
  listCustomFields,
  createCustomField,
  deleteCustomField,
  listCustomValues,
  saveCustomValues,
} from "./handlers/custom-fields";

export type { Env };

const PUBLIC_ROUTES: Array<{ method: string; pathname: string }> = [
  { method: "POST", pathname: "/api/auth/login" },
];

function isPublicRoute(method: string, pathname: string): boolean {
  // Ảnh avatar phục vụ công khai để thẻ <img> tải được (không gửi được token).
  if (method === "GET" && pathname.startsWith("/api/avatars/")) return true;
  return PUBLIC_ROUTES.some((r) => r.method === method && r.pathname === pathname);
}

// --- Phân quyền theo vai trò (chặn ở API, không chỉ ẩn ở giao diện) ---
const R_SUPER = ["super"] as const;
const R_HR = ["super", "hr"] as const;
const R_MANAGER = ["super", "hr", "lead"] as const;
const R_ALL = ["super", "hr", "lead", "staff"] as const;

// Quy tắc cho các thao tác THAY ĐỔI dữ liệu. Không khớp quy tắc nào → mặc định
// chỉ super/hr (an toàn mặc định cho mọi route ghi mới thêm sau này).
const AUTHZ: { m: string; re: RegExp; roles: readonly string[] }[] = [
  { m: "POST", re: /^\/api\/auth\/logout$/, roles: R_ALL },
  { m: "POST", re: /^\/api\/leave\/requests$/, roles: R_ALL }, // nộp đơn nghỉ: tự phục vụ
  { m: "PUT", re: /^\/api\/leave\/requests\/\d+$/, roles: R_MANAGER }, // duyệt/từ chối
  { m: "POST", re: /^\/api\/kpi\/\d+\/sign$/, roles: R_MANAGER },
  { m: "POST", re: /^\/api\/kpi$/, roles: R_MANAGER },
  { m: "PUT", re: /^\/api\/kpi\/\d+$/, roles: R_MANAGER },
  { m: "POST", re: /^\/api\/rewards$/, roles: R_MANAGER },
  { m: "PUT", re: /^\/api\/rewards\/\d+$/, roles: R_MANAGER },
  { m: "POST", re: /^\/api\/improvement-plans$/, roles: R_MANAGER },
  { m: "PUT", re: /^\/api\/config$/, roles: R_SUPER },
  { m: "PUT", re: /^\/api\/permissions$/, roles: R_SUPER },
];

/** 403 nếu vai trò không đủ; null nếu được phép. Chỉ gác request thay đổi dữ liệu. */
function authorize(method: string, pathname: string, role: string): Response | null {
  if (method === "GET" || !pathname.startsWith("/api/")) return null;
  const rule = AUTHZ.find((r) => r.m === method && r.re.test(pathname));
  const allowed = rule ? rule.roles : R_HR;
  if (allowed.includes(role)) return null;
  return error("Bạn không có quyền thực hiện thao tác này.", 403);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.CORS_ORIGIN || "*";
    const preflight = handlePreflight(request, origin);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    const headers = corsHeaders(origin);

    const withCors = (response: Response): Response => {
      const merged = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) merged.set(key, value);
      return new Response(response.body, { status: response.status, headers: merged });
    };

    try {
      // Tự động áp migration còn thiếu (một lần cho mỗi isolate, sau mỗi deploy).
      if (pathname.startsWith("/api/")) await ensureSchema(env);

      let userId = 0;
      let userRole = "";
      if (!isPublicRoute(method, pathname)) {
        if (pathname.startsWith("/api/")) {
          const auth = await authMiddleware(request, env);
          if (!auth) return withCors(error("Unauthorized", 401));
          userId = auth.userId;
          userRole = auth.role;
          const denied = authorize(method, pathname, userRole);
          if (denied) return withCors(denied);
        }
      }

      // --- Auth routes ---
      if (method === "POST" && pathname === "/api/auth/login") return withCors(await login(request, env));
      if (method === "POST" && pathname === "/api/auth/logout") return withCors(await logout(request, env));
      if (method === "GET" && pathname === "/api/auth/me") return withCors(await me(request, env));

      // --- Employees ---
      if (method === "POST" && pathname === "/api/org/hierarchy") return withCors(await updateHierarchy(request, env, userId, userRole));
      if (method === "GET" && pathname === "/api/employees") return withCors(await listEmployees(request, env));
      if (method === "POST" && pathname === "/api/employees/import") return withCors(await importEmployees(request, env));
      if (method === "POST" && pathname === "/api/employees") return withCors(await createEmployee(request, env));

      // --- Custom fields (cột tùy chỉnh) — phải đứng trước route employees/:id ---
      if (method === "GET" && pathname === "/api/custom-fields") return withCors(await listCustomFields(request, env));
      if (method === "POST" && pathname === "/api/custom-fields") return withCors(await createCustomField(request, env));
      if (method === "GET" && pathname === "/api/custom-fields/values") return withCors(await listCustomValues(request, env));
      if (method === "DELETE" && pathname.startsWith("/api/custom-fields/")) {
        const id = parseIdFromPath(pathname, "/api/custom-fields/");
        if (!id) return withCors(error("Thiếu id cột", 400));
        return withCors(await deleteCustomField(request, env, id));
      }
      if (method === "PUT" && /^\/api\/employees\/\d+\/custom-values$/.test(pathname)) {
        const id = parseIdFromPath(pathname, "/api/employees/");
        if (!id) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await saveCustomValues(request, env, id));
      }

      // Avatar: upload ảnh lên R2 (đặt trước route PUT employees/:id).
      if (method === "POST" && /^\/api\/employees\/\d+\/avatar$/.test(pathname)) {
        const id = parseIdFromPath(pathname, "/api/employees/");
        if (!id) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await uploadAvatar(request, env, id));
      }
      // Phục vụ ảnh avatar công khai từ R2.
      if (method === "GET" && pathname.startsWith("/api/avatars/")) {
        const key = pathname.slice("/api/avatars/".length);
        if (!key) return withCors(error("Thiếu key ảnh", 400));
        return withCors(await serveAvatar(request, env, key));
      }

      if (method === "GET" && pathname.startsWith("/api/employees/")) {
        const id = parseIdFromPath(pathname, "/api/employees/");
        if (!id) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await getEmployee(request, env, id));
      }
      if (method === "PUT" && pathname.startsWith("/api/employees/")) {
        const id = parseIdFromPath(pathname, "/api/employees/");
        if (!id) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await updateEmployee(request, env, id));
      }
      if (method === "DELETE" && pathname.startsWith("/api/employees/")) {
        const id = parseIdFromPath(pathname, "/api/employees/");
        if (!id) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await deleteEmployee(request, env, id));
      }

      // --- Departments ---
      if (method === "GET" && pathname === "/api/departments") return withCors(await listDepartments(request, env));
      if (method === "POST" && pathname === "/api/departments") return withCors(await createDepartment(request, env));
      if (method === "PUT" && pathname.startsWith("/api/departments/")) {
        const id = parseIdFromPath(pathname, "/api/departments/");
        if (!id) return withCors(error("Thiếu id phòng ban", 400));
        return withCors(await updateDepartment(request, env, id));
      }
      if (method === "DELETE" && pathname.startsWith("/api/departments/")) {
        const id = parseIdFromPath(pathname, "/api/departments/");
        if (!id) return withCors(error("Thiếu id phòng ban", 400));
        return withCors(await deleteDepartment(request, env, id));
      }

      // --- Attendance ---
      if (method === "GET" && pathname === "/api/attendance/periods") return withCors(await listAttendancePeriods(request, env));
      if (method === "POST" && pathname === "/api/attendance/import") return withCors(await importAttendance(request, env));
      if (method === "GET" && pathname === "/api/attendance") return withCors(await listAttendance(request, env));
      if (method === "PUT" && pathname.startsWith("/api/attendance/")) {
        const id = parseIdFromPath(pathname, "/api/attendance/");
        if (!id) return withCors(error("Thiếu id chấm công", 400));
        return withCors(await updateAttendance(request, env, id));
      }

      // --- Overtime (chi tiết tăng ca theo ngày) ---
      if (method === "GET" && pathname === "/api/overtime") return withCors(await listOvertimeDaily(request, env));
      if (method === "PUT" && pathname === "/api/overtime") return withCors(await saveOvertimeDaily(request, env));

      // --- Leave ---
      if (method === "GET" && pathname === "/api/leave/requests") return withCors(await listLeaveRequests(request, env));
      if (method === "POST" && pathname === "/api/leave/requests") return withCors(await createLeaveRequest(request, env, userId));
      if (method === "PUT" && pathname.startsWith("/api/leave/requests/")) {
        const id = parseIdFromPath(pathname, "/api/leave/requests/");
        if (!id) return withCors(error("Thiếu id đơn nghỉ phép", 400));
        return withCors(await updateLeaveRequest(request, env, id, userId));
      }
      if (method === "GET" && pathname.startsWith("/api/leave/balance/")) {
        const employeeId = parseIdFromPath(pathname, "/api/leave/balance/");
        if (!employeeId) return withCors(error("Thiếu id nhân viên", 400));
        return withCors(await getLeaveBalance(request, env, employeeId));
      }

      // --- Salary ---
      if (method === "GET" && pathname === "/api/salary") return withCors(await getSalary(request, env));

      // --- KPI ---
      if (method === "GET" && pathname === "/api/kpi") return withCors(await getKpi(request, env));
      if (method === "POST" && pathname === "/api/kpi") return withCors(await createKpi(request, env));
      if (method === "PUT" && pathname.startsWith("/api/kpi/")) {
        const id = parseIdFromPath(pathname, "/api/kpi/");
        if (!id) return withCors(error("Thiếu id KPI", 400));
        return withCors(await updateKpi(request, env, id));
      }
      if (method === "POST" && pathname.startsWith("/api/kpi/") && pathname.endsWith("/sign")) {
        const rest = pathname.slice("/api/kpi/".length);
        const id = rest.split("/")[0];
        if (!id) return withCors(error("Thiếu id KPI", 400));
        return withCors(await signKpi(request, env, id));
      }

      // --- Recognition / Rewards ---
      if (method === "GET" && pathname === "/api/rewards") return withCors(await listRewards(request, env));
      if (method === "POST" && pathname === "/api/rewards") return withCors(await createReward(request, env, userId));
      if (method === "PUT" && pathname.startsWith("/api/rewards/")) {
        const id = parseIdFromPath(pathname, "/api/rewards/");
        if (!id) return withCors(error("Thiếu id khen thưởng", 400));
        return withCors(await updateReward(request, env, id, userId));
      }

      // --- Improvement Plans ---
      if (method === "GET" && pathname === "/api/improvement-plans") return withCors(await listImprovementPlans(request, env));
      if (method === "POST" && pathname === "/api/improvement-plans") return withCors(await createImprovementPlan(request, env));

      // --- Config ---
      if (method === "GET" && pathname === "/api/config") return withCors(await getConfig(request, env));
      if (method === "PUT" && pathname === "/api/config") return withCors(await updateConfig(request, env));

      // --- Permissions ---
      if (method === "GET" && pathname === "/api/permissions") return withCors(await getPermissions(request, env));
      if (method === "PUT" && pathname === "/api/permissions") return withCors(await updatePermissions(request, env));

      // --- Files ---
      if (method === "POST" && pathname === "/api/files/upload") return withCors(await uploadFile(request, env));
      if (method === "GET" && pathname.startsWith("/api/files/")) {
        const key = parseIdFromPath(pathname, "/api/files/");
        if (!key) return withCors(error("Thiếu key tệp tin", 400));
        return withCors(await downloadFile(request, env, key));
      }

      return withCors(error("Không tìm thấy route", 404));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal Server Error";
      return withCors(error(message, 500));
    }
  },
};
