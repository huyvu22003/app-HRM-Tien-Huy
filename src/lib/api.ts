"use client";

import { mockResolve, isDemoMode, enableDemoMode, setDemoUser } from "@/lib/mock-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
const TOKEN_KEY = "hrm_tien_huy_token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage failures
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage failures
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (isDemoMode()) {
    const mock = mockResolve(path, options.method || "GET", options.body);
    if (mock !== null) return mock as T;
  }

  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  // Timeout để request không treo vô hạn (mạng di động chập chờn) → rơi về mock/lỗi.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        msg = body.error || body.message || msg;
      } catch {
        // use statusText
      }
      throw new ApiError(res.status, msg);
    }

    return await res.json();
  } catch (err) {
    const mock = mockResolve(path, options.method || "GET", options.body);
    if (mock !== null) {
      enableDemoMode();
      return mock as T;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// --- Auth ---

export interface ApiUser {
  id: number;
  employee_id: number | null;
  phone: string;
  role: "super" | "hr" | "lead" | "staff";
  name?: string;
  department_id?: number;
  position?: string;
  photo_url?: string | null;
}

export async function apiLogin(phone: string, password: string) {
  try {
    const res = await api.post<{ token: string; user: ApiUser }>("/auth/login", {
      phone,
      password,
    });
    setToken(res.token);
    return res;
  } catch {
    const { findAccountByPhone, ACCOUNTS } = await import("@/lib/data/accounts");
    const acc = findAccountByPhone(phone);
    if (acc && acc.password === password) {
      enableDemoMode();
      const token = "demo-" + Date.now();
      setToken(token);
      const accountKeys = Object.keys(ACCOUNTS);
      const accountIdx = accountKeys.indexOf(phone);
      const userId = accountIdx >= 0 ? accountIdx + 1 : 1;
      const demoUser = {
        id: userId,
        employee_id: userId,
        phone: acc.phone,
        role: acc.role as ApiUser["role"],
        name: acc.name,
      };
      setDemoUser(demoUser);
      return { token, user: demoUser };
    }
    throw new ApiError(401, "Số điện thoại hoặc mật khẩu không đúng");
  }
}

export async function apiLogout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearToken();
    setDemoUser(null);
  }
}

export async function apiMe() {
  return api.get<{ user: ApiUser }>("/auth/me");
}

// --- Employees ---

export interface ApiEmployee {
  id: number;
  code: string;
  name: string;
  gender: string | null;
  dob: string | null;
  phone: string | null;
  cccd: string | null;
  address: string | null;
  email: string | null;
  department_id: number | null;
  department_name: string | null;
  position: string | null;
  workplace: string | null;
  contract_type: string | null;
  contract_end: string | null;
  join_date: string | null;
  resign_request_date: string | null;
  resign_date: string | null;
  status: string;
  manager: string | null;
  manager_employee_id: number | null;
  manager_name: string | null;
  level: string | null;
  photo_url: string | null;
  bank: string | null;
  tax_code: string | null;
  updated_at: string | null;
  // Tổng hợp lương/bảo hiểm (để cột danh sách khớp với chi tiết)
  dependents: number | null;
  base_salary: number | null;
  allowance: number | null;
  responsibility_salary: number | null;
  gas_allowance: number | null;
  attendance_bonus: number | null;
  ins_status: string | null;
  ins_salary_base: number | null;
  // Hồ sơ mở rộng (Phase 2)
  resign_reason: string | null;
  contract_date_1: string | null;
  contract_date_2: string | null;
  contract_date_3: string | null;
  birth_year: string | null;
  birth_place: string | null;
  education: string | null;
  specialization: string | null;
  temp_address: string | null;
  cccd_issue_date: string | null;
  cccd_issue_place: string | null;
  nationality: string | null;
  religion: string | null;
  ethnicity: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  bhxh_no: string | null;
  bhxh_increase_date: string | null;
  bhxh_decrease_date: string | null;
  relative_name: string | null;
  relative_relation: string | null;
  relative_phone: string | null;
}

export interface ApiCompensation {
  id: number;
  employee_id: number;
  base_salary: number;
  allowance: number;
  responsibility_salary: number | null;
  gas_allowance: number | null;
  attendance_bonus: number | null;
  dependents: number;
  effective_from: string | null;
}

export interface ApiInsurance {
  id: number;
  employee_id: number;
  status: string;
  ins_code: string | null;
  bhxh_book: string | null;
  bhyt_code: string | null;
  bhyt_clinic: string | null;
  start_date: string | null;
  salary_base: number;
}

export function fetchEmployees(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: number;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.search) q.set("search", params.search);
  if (params?.departmentId) q.set("departmentId", String(params.departmentId));
  const qs = q.toString();
  return api.get<ApiEmployeePage>(`/employees${qs ? `?${qs}` : ""}`);
}

export interface ApiEmployeePage {
  data: ApiEmployee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchAllEmployees(
  fetchPage: typeof fetchEmployees = fetchEmployees,
  pageSize = 200,
): Promise<ApiEmployeePage> {
  const firstPage = await fetchPage({ page: 1, pageSize });
  const responsePageSize = firstPage.pageSize > 0 ? firstPage.pageSize : pageSize;
  const pageCount = Number.isFinite(firstPage.total) && firstPage.total > 0
    ? Math.max(1, Math.ceil(firstPage.total / responsePageSize))
    : 1;
  const pages = [firstPage];
  for (let page = 2; page <= pageCount; page += 1) {
    pages.push(await fetchPage({ page, pageSize }));
  }
  return {
    ...firstPage,
    data: pages.flatMap((result) => result.data),
    page: 1,
    pageSize: responsePageSize,
    totalPages: pageCount,
  };
}

export function fetchEmployee(id: number | string) {
  return api.get<{
    employee: ApiEmployee;
    compensation: ApiCompensation | null;
    insurance: ApiInsurance | null;
  }>(`/employees/${id}`);
}

export function createEmployee(data: Record<string, unknown>) {
  return api.post<{ id: number }>("/employees", data);
}

export function updateEmployee(id: number | string, data: Record<string, unknown>) {
  return api.put<{ success: boolean }>(`/employees/${id}`, data);
}

/**
 * Tải avatar lên R2 qua Worker. Nhận data URL (base64), gửi bytes thô lên
 * `/employees/:id/avatar`; server lưu R2 + cập nhật photo_url và trả URL công khai.
 * Ném lỗi nếu R2 chưa bật (503) để nơi gọi fallback về D1.
 */
export async function uploadEmployeeAvatar(
  id: number | string,
  dataUrl: string,
): Promise<{ url: string; key: string }> {
  const blob = await (await fetch(dataUrl)).blob();
  const token = getToken();
  const res = await fetch(`${API_BASE}/employees/${id}/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: blob,
  });
  if (!res.ok) throw new ApiError(res.status, "Tải avatar lên R2 thất bại");
  return res.json();
}

export type HierarchyMutation =
  | { action: "move"; employeeId: number; managerEmployeeId: number | null; expectedUpdatedAt?: string | null }
  | { action: "insert"; candidateId: number; branchRootId: number; expectedUpdatedAt?: string | null }
  | { action: "remove-level"; employeeId: number; expectedUpdatedAt?: string | null };

export function updateHierarchy(data: HierarchyMutation) {
  return api.post<{ success: boolean; affectedEmployeeIds: number[] }>("/org/hierarchy", data);
}

export function deleteEmployee(id: number) {
  return api.delete<{ success: boolean }>(`/employees/${id}`);
}

export function importEmployees(
  employees: Record<string, unknown>[],
  mode: "upsert" | "replace" = "upsert",
) {
  return api.post<{ success: boolean; created: number; updated: number; deleted: number }>(
    "/employees/import",
    { employees, mode },
  );
}

// --- Custom fields (cột tùy chỉnh) ---

export interface ApiCustomField {
  id: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
}

export type CustomValuesMap = Record<string, Record<string, string>>;

export function fetchCustomFields() {
  return api.get<{ data: ApiCustomField[] }>("/custom-fields");
}

export function createCustomFieldApi(field: { label: string; type: string; options?: string[] }) {
  return api.post<ApiCustomField>("/custom-fields", field);
}

export function deleteCustomFieldApi(id: string) {
  return api.delete<{ success: boolean }>(`/custom-fields/${id}`);
}

export function fetchCustomValues() {
  return api.get<{ data: CustomValuesMap }>("/custom-fields/values");
}

export function saveCustomValuesApi(employeeId: number | string, values: Record<string, string>) {
  return api.put<{ success: boolean }>(`/employees/${employeeId}/custom-values`, values);
}

// --- Departments ---

export interface ApiDepartment {
  id: number;
  name: string;
  block: string;
  block_color: string;
  head_employee_id: number | null;
  parent_id: number | null;
  employee_count: number;
}

export function fetchDepartments() {
  return api.get<{ data: ApiDepartment[] }>("/departments");
}

export function createDepartment(data: {
  name: string;
  block: string;
  blockColor?: string;
  headEmployeeId?: number | null;
}) {
  return api.post<{ id: number }>("/departments", data);
}

export function updateDepartment(
  id: number | string,
  data: { name?: string; block?: string; blockColor?: string; headEmployeeId?: number | null },
) {
  return api.put<{ success: boolean }>(`/departments/${id}`, data);
}

export function deleteDepartment(id: number | string) {
  return api.delete<{ success: boolean }>(`/departments/${id}`);
}

// --- Attendance ---

export interface ApiAttendance {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  period: string;
  std_days: number;
  actual_days: number;
  pn: number;
  pb: number;
  vr: number;
  kp: number;
  pc?: number;
  pts?: number;
  pt?: number;
  tnld?: number;
  overtime_hours: number;
  ot_weekday_hours?: number;
  ot_sunday_hours?: number;
  ot_holiday_hours?: number;
  gas_days?: number;
  meal_allowance?: number;
  is_edited: number;
  locked: number;
}

export function fetchAttendance(period: string) {
  return api.get<{ data: ApiAttendance[]; period: string }>(
    `/attendance?period=${period}`,
  );
}

export function updateAttendance(
  id: number,
  data: Record<string, unknown>,
) {
  return api.put<{ success: boolean }>(`/attendance/${id}`, data);
}

/** Danh sách kỳ đã có dữ liệu chấm công (mới nhất trước). */
export function fetchAttendancePeriods() {
  return api.get<{ data: string[] }>("/attendance/periods");
}

export interface ApiLeaveSuggestion {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  type_code: string;
  days: number;
  from_date: string;
  to_date: string;
  attendance_id: number | null;
  attendance_locked: number | null;
}

/** Đơn nghỉ đã duyệt trong kỳ, chưa áp vào bảng chấm công. */
export function fetchLeaveSuggestions(period: string) {
  return api.get<{ data: ApiLeaveSuggestion[]; period: string }>(
    `/attendance/leave-suggestions?period=${encodeURIComponent(period)}`,
  );
}

/** Cộng đơn nghỉ đã duyệt vào cột chấm công tương ứng. */
export function applyLeaveToAttendance(leaveId: number) {
  return api.post<{ success: boolean; column?: string; days?: number; period?: string }>(
    "/attendance/apply-leave",
    { leaveId },
  );
}

export interface AttendanceImportRow {
  code?: string;
  name?: string;
  stdDays?: number;
  actualDays?: number;
  overtimeHours?: number;
  otWeekdayHours?: number;
  otSundayHours?: number;
  otHolidayHours?: number;
  gasDays?: number;
  mealAllowance?: number;
  otDaily?: { day: number; hours: number }[];
}

// --- Overtime (chi tiết tăng ca theo ngày) ---

export interface ApiOvertimeDay {
  day: number;
  hours: number;
  no_meal?: number;
  note: string | null;
}

export interface OvertimeTotals {
  otWeekdayHours: number;
  otSundayHours: number;
  otHolidayHours: number;
  overtimeHours: number;
  mealAllowance: number;
}

/** Lấy chi tiết OT theo ngày của 1 nhân viên trong 1 kỳ. */
export function fetchOvertimeDaily(employeeId: number, period: string) {
  return api.get<{ data: ApiOvertimeDay[]; employeeId: number; period: string }>(
    `/overtime?employeeId=${employeeId}&period=${period}`,
  );
}

/** Lưu lưới OT theo ngày; server tính lại tổng NT/CN + tiền cơm về bảng chấm công. */
export function saveOvertimeDaily(payload: {
  employeeId: number;
  period: string;
  days: { day: number; hours: number; noMeal?: boolean; note?: string | null }[];
  holidayHours: number;
}) {
  return api.put<{ success: boolean; totals: OvertimeTotals }>("/overtime", payload);
}

/** Nhập chấm công hàng loạt cho 1 kỳ (bulk upsert). */
export function importAttendance(period: string, rows: AttendanceImportRow[]) {
  return api.post<{ success: boolean; imported: number; unmatched: string[] }>(
    "/attendance/import",
    { period, rows },
  );
}

// --- Leave ---

export interface ApiLeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  type_code: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  status: string;
  current_step: number;
  created_at: string;
}

export interface ApiLeaveBalance {
  employee_id: number;
  year: number;
  entitled: number;
  carried: number;
  used: number;
  pending: number;
  remaining: number;
}

export function fetchLeaveRequests(params?: {
  employeeId?: number;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.employeeId) q.set("employeeId", String(params.employeeId));
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return api.get<{ data: ApiLeaveRequest[] }>(
    `/leave/requests${qs ? `?${qs}` : ""}`,
  );
}

// --- Maternity (theo dõi thai kỳ + khám thai) ---

export interface ApiPrenatalCheckup {
  id: number;
  maternity_id: number;
  seq: number;
  checkup_date: string | null;
  days: number;
  special: number;
  doc_submitted: number;
  doc_key: string | null;
  doc_name: string | null;
  note: string | null;
}

export interface ApiMaternity {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_name: string | null;
  notified_date: string | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  months: number;
  children: number;
  status: string;
  note: string | null;
  checkups: ApiPrenatalCheckup[];
}

export function fetchMaternity() {
  return api.get<{ data: ApiMaternity[] }>("/maternity");
}

export function createMaternity(data: {
  employeeId: number;
  notifiedDate?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  months?: number;
  children?: number;
  status?: string;
  note?: string | null;
}) {
  return api.post<{ id: number }>("/maternity", data);
}

export function updateMaternity(id: number, data: Record<string, unknown>) {
  return api.put<{ success: boolean }>(`/maternity/${id}`, data);
}

export function saveMaternityCheckups(
  id: number,
  checkups: {
    seq: number;
    date?: string | null;
    days?: number;
    special?: boolean;
    docSubmitted?: boolean;
    docKey?: string | null;
    docName?: string | null;
    note?: string | null;
  }[],
) {
  return api.put<{ success: boolean; count: number }>(`/maternity/${id}/checkups`, { checkups });
}

/**
 * Tải giấy chứng nhận nghỉ hưởng BHXH của một lần khám thai lên R2.
 * Gửi bytes thô kèm tên gốc; server trả { key, name } để lưu vào hồ sơ khi bấm Lưu.
 */
export async function uploadCheckupDoc(file: File): Promise<{ key: string; name: string }> {
  if (isDemoMode()) return { key: `demo-${Date.now()}-${file.name}`, name: file.name };
  const token = getToken();
  const res = await fetch(`${API_BASE}/maternity/checkup-doc?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });
  if (!res.ok) {
    const msg = res.status === 503 ? "Kho lưu trữ R2 chưa được bật." : "Tải giấy BHXH lên thất bại.";
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

/** Mở giấy BHXH đã tải lên (route yêu cầu đăng nhập → tải blob kèm token rồi mở tab mới). */
export async function openCheckupDoc(key: string, name?: string | null): Promise<void> {
  if (isDemoMode() || key.startsWith("demo-")) return; // demo: không có tệp thật để mở
  const token = getToken();
  const res = await fetch(`${API_BASE}/maternity/checkup-doc/${encodeURIComponent(key)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new ApiError(res.status, "Không mở được giấy BHXH.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open(objectUrl, "_blank");
  // Trình duyệt chặn popup → tải xuống thay thế.
  if (!win) {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || key;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function createLeaveRequest(data: {
  employeeId: number;
  typeCode: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
}) {
  return api.post<{ id: number }>("/leave/requests", data);
}

export function updateLeaveRequest(
  id: number,
  data: { action: "approve" | "reject"; step?: 1 | 2 },
) {
  return api.put<{ success: boolean; status: string }>(
    `/leave/requests/${id}`,
    data,
  );
}

export function fetchLeaveBalance(employeeId: number) {
  return api.get<{ data: ApiLeaveBalance }>(
    `/leave/balance/${employeeId}`,
  );
}

// --- Salary ---

export interface ApiSalaryRow {
  employee_id: number;
  code: string;
  name: string;
  department_id: number | null;
  department_name: string | null;
  base_salary: number | null;
  allowance: number | null;
  responsibility_salary: number | null;
  gas_allowance: number | null;
  attendance_bonus: number | null;
  union_dues: number | null;
  dependents: number | null;
  kpi_bonus: number | null;
  hot_bonus: number | null;
  advance: number | null;
  advance_ck: number | null;
  advance_tm: number | null;
  company_debt: number | null;
  pay_method: string | null;
  merge_into: string | null;
  bank: string | null;
  std_days: number | null;
  actual_days: number | null;
  gas_days: number | null;
  leave_days: number | null;
  overtime_hours: number | null;
  ot_weekday_hours: number | null;
  ot_sunday_hours: number | null;
  ot_holiday_hours: number | null;
  ot_night_hours: number | null;
  meal_allowance: number | null;
  night_allowance: number | null;
  bonus: number | null;
  ins_salary_base: number | null;
  bhxh_amount: number | null;
  bhyt_amount: number | null;
  bhtn_amount: number | null;
  kpi_score: number | null;
  kpi_rank: string | null;
}

export function fetchSalary(period: string) {
  return api.get<{ data: ApiSalaryRow[]; period: string }>(
    `/salary?period=${period}`,
  );
}

// --- KPI ---

export interface ApiKpi {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_name: string | null;
  period: string;
  score: number;
  rank: string | null;
  bc: number;
  ns: number;
  cl: number;
  dg: number;
  note: string | null;
  is_edited: number;
  signed_l1: number;
  signed_l2: number;
}

export function fetchKpi(period: string) {
  return api.get<{ data: ApiKpi[]; period: string }>(
    `/kpi?period=${period}`,
  );
}

export function createKpi(data: {
  employee_id: number;
  period: string;
  bc: number;
  ns: number;
  cl: number;
  dg: number;
  note?: string;
}) {
  return api.post<{ id: number; score: number; rank: string }>("/kpi", data);
}

export function updateKpi(id: number, data: { bc?: number; ns?: number; cl?: number; dg?: number; note?: string }) {
  return api.put<{ success: boolean; score: number; rank: string }>(`/kpi/${id}`, data);
}

export function signKpi(id: number, level: 1 | 2) {
  return api.post<{ success: boolean }>(`/kpi/${id}/sign`, { level });
}

// --- Rewards / Recognition ---

export interface ApiReward {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  period: string;
  type: "kpi_bonus" | "hot_bonus" | "recognition";
  amount: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  proposed_by: number | null;
  proposed_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

export function fetchRewards(period?: string) {
  const qs = period ? `?period=${period}` : "";
  return api.get<{ data: ApiReward[] }>(`/rewards${qs}`);
}

export function createReward(data: {
  employee_id: number;
  period: string;
  type: string;
  amount?: number;
  reason?: string;
}) {
  return api.post<{ id: number }>("/rewards", data);
}

export function updateReward(id: number, data: { action: "approve" | "reject" }) {
  return api.put<{ success: boolean; status: string }>(`/rewards/${id}`, data);
}

// --- Improvement Plans ---

export interface ApiImprovementPlan {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  period: string;
  kpi_score: number;
  step: "remind" | "training" | "commitment";
  note: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export function fetchImprovementPlans(period?: string) {
  const qs = period ? `?period=${period}` : "";
  return api.get<{ data: ApiImprovementPlan[] }>(`/improvement-plans${qs}`);
}

export function createImprovementPlan(data: {
  employee_id: number;
  period: string;
  kpi_score: number;
  step: string;
  note?: string;
}) {
  return api.post<{ id: number }>("/improvement-plans", data);
}

// --- Daily Reports ---

export interface ApiDailyReport {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_name: string;
  date: string;
  content: string;
  quantity: number;
  ng_count: number;
  note: string | null;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  verified_by: number | null;
  verified_by_name: string | null;
  verified_at: string | null;
}

export function fetchDailyReports(date: string) {
  return api.get<{ data: ApiDailyReport[] }>(`/reports?date=${date}`);
}

export function createDailyReport(data: {
  date: string;
  content: string;
  quantity: number;
  ng_count: number;
  note?: string;
}) {
  return api.post<{ id: number }>("/reports", data);
}

export function verifyDailyReport(
  id: number,
  data: { action: "verify" | "reject"; note?: string },
) {
  return api.put<{ success: boolean; status: string }>(`/reports/${id}`, data);
}

// --- Config ---

export function fetchConfig() {
  return api.get<{ data: Record<string, unknown> }>("/config");
}

export function updateConfig(data: Record<string, unknown>) {
  return api.put<{ success: boolean }>("/config", data);
}

// --- Permissions ---

export function fetchPermissions() {
  return api.get<{ data: Array<{ role: string; module: string; action: string; allowed: number }> }>(
    "/permissions",
  );
}

export function updatePermissions(
  data: Array<{ role: string; module: string; action: string; allowed: number }>,
) {
  return api.put<{ success: boolean }>("/permissions", data);
}
