"use client";

import { mockResolve, isDemoMode, enableDemoMode } from "@/lib/mock-api";

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
    const mock = mockResolve(path);
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

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
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

    return res.json();
  } catch (err) {
    const mock = mockResolve(path);
    if (mock !== null) {
      enableDemoMode();
      return mock as T;
    }
    throw err;
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
    const { findAccountByPhone } = await import("@/lib/data/accounts");
    const acc = findAccountByPhone(phone);
    if (acc && acc.password === password) {
      enableDemoMode();
      const token = "demo-" + Date.now();
      setToken(token);
      return {
        token,
        user: {
          id: 1,
          employee_id: 1,
          phone: acc.phone,
          role: acc.role as ApiUser["role"],
          name: acc.name,
        },
      };
    }
    throw new ApiError(401, "Số điện thoại hoặc mật khẩu không đúng");
  }
}

export async function apiLogout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearToken();
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
  level: string | null;
  photo_url: string | null;
  bank: string | null;
  tax_code: string | null;
}

export interface ApiCompensation {
  id: number;
  employee_id: number;
  base_salary: number;
  allowance: number;
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
  return api.get<{
    data: ApiEmployee[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/employees${qs ? `?${qs}` : ""}`);
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
  overtime_hours: number;
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
  id: number;
  employee_id: number;
  year: number;
  entitled: number;
  carried: number;
  used: number;
  pending: number;
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
