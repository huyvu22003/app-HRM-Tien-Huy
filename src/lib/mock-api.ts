"use client";

import { EMPLOYEES } from "@/lib/data/employees";
import { DEPARTMENTS, BLOCK_ORDER } from "@/lib/data/departments";
import { ACCOUNTS } from "@/lib/data/accounts";

function toApiEmployee(e: (typeof EMPLOYEES)[number], idx: number) {
  return {
    id: idx + 1,
    code: e.code,
    name: e.name,
    gender: e.gender || null,
    dob: e.dob || null,
    phone: e.phone || null,
    cccd: e.cccd || null,
    address: e.address || null,
    email: e.email || null,
    department_id: DEPARTMENTS.findIndex((d) => d.name === e.department) + 1,
    department_name: e.department,
    position: e.position || null,
    workplace: e.workplace || null,
    contract_type: e.contractType || null,
    contract_end: e.contractEnd || null,
    join_date: e.joinDate || null,
    resign_request_date: null,
    resign_date: e.resignDate || null,
    status: e.status || "active",
    manager: e.manager || null,
    level: e.level || null,
    photo_url: null,
    bank: e.bank || null,
    tax_code: e.taxCode || null,
  };
}

const apiEmployees = EMPLOYEES.map(toApiEmployee);

function toApiDepartment(d: (typeof DEPARTMENTS)[number], idx: number) {
  return {
    id: idx + 1,
    name: d.name,
    block: d.block,
    block_color: d.blockColor,
    head_employee_id: null,
    parent_id: null,
    employee_count: EMPLOYEES.filter((e) => e.department === d.name).length,
  };
}

type ApiDept = {
  id: number;
  name: string;
  block: string;
  block_color: string;
  head_employee_id: number | null;
  parent_id: number | null;
  employee_count: number;
};

const DEPT_STORE_KEY = "hrm_demo_departments";

function defaultDepartments(): ApiDept[] {
  return DEPARTMENTS.map(toApiDepartment);
}

function loadDepartments(): ApiDept[] {
  try {
    const stored = window.localStorage.getItem(DEPT_STORE_KEY);
    if (stored) return JSON.parse(stored) as ApiDept[];
  } catch {
    /* ignore */
  }
  return defaultDepartments();
}

function persistDepartments() {
  try {
    window.localStorage.setItem(DEPT_STORE_KEY, JSON.stringify(_departments));
  } catch {
    /* ignore */
  }
}

let _departments: ApiDept[] | null = null;

function getDepartments(): ApiDept[] {
  if (!_departments) _departments = loadDepartments();
  return _departments;
}

function sortedDepartments(): ApiDept[] {
  const rank = (block: string) => {
    const i = BLOCK_ORDER.indexOf(block);
    return i === -1 ? 99 : i;
  };
  return [...getDepartments()].sort((a, b) => rank(a.block) - rank(b.block) || a.id - b.id);
}

const STD_DAYS = 26;

function mockSalaryRows() {
  return EMPLOYEES.slice(0, 20).map((e, i) => {
    const base = e.baseSalary || 8_000_000;
    return {
      employee_id: i + 1,
      code: e.code,
      name: e.name,
      department_id: DEPARTMENTS.findIndex((d) => d.name === e.department) + 1,
      department_name: e.department,
      base_salary: base,
      allowance: e.allowance || 300_000,
      responsibility_salary: 0,
      gas_allowance: 200_000,
      attendance_bonus: 450_000,
      union_dues: 50_000,
      dependents: e.dependents || 0,
      kpi_bonus: 0,
      hot_bonus: 0,
      advance: 0,
      std_days: STD_DAYS,
      actual_days: STD_DAYS,
      gas_days: STD_DAYS,
      leave_days: 0,
      overtime_hours: 10,
      ot_weekday_hours: 10,
      ot_sunday_hours: 0,
      ot_holiday_hours: 0,
      ot_night_hours: 0,
      meal_allowance: 0,
      night_allowance: 0,
      bonus: 0,
      ins_salary_base: base,
      bhxh_amount: Math.round(base * 0.08),
      bhyt_amount: Math.round(base * 0.015),
      bhtn_amount: Math.round(base * 0.01),
      kpi_score: 80 + Math.floor(Math.random() * 20),
      kpi_rank: "B",
    };
  });
}

function mockAttendance(period: string) {
  return EMPLOYEES.slice(0, 20).map((e, i) => ({
    id: i + 1,
    employee_id: i + 1,
    employee_name: e.name,
    employee_code: e.code,
    period,
    std_days: STD_DAYS,
    actual_days: 22 + Math.floor(Math.random() * 5),
    pn: 0,
    pb: 0,
    vr: 0,
    kp: 0,
    overtime_hours: Math.floor(Math.random() * 20),
    is_edited: 0,
    locked: 0,
  }));
}

function mockKpi(period: string) {
  return EMPLOYEES.slice(0, 20).map((e, i) => {
    const bc = 15 + Math.floor(Math.random() * 10);
    const ns = 15 + Math.floor(Math.random() * 10);
    const cl = 15 + Math.floor(Math.random() * 10);
    const dg = 15 + Math.floor(Math.random() * 10);
    const score = bc + ns + cl + dg;
    const rank = score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
    return {
      id: i + 1,
      employee_id: i + 1,
      employee_name: e.name,
      employee_code: e.code,
      department_name: e.department,
      period,
      score,
      rank,
      bc,
      ns,
      cl,
      dg,
      note: null,
      is_edited: 0,
      signed_l1: 0,
      signed_l2: 0,
    };
  });
}

function mockLeaveRequests() {
  return [
    {
      id: 1,
      employee_id: 1,
      employee_name: EMPLOYEES[0].name,
      employee_code: EMPLOYEES[0].code,
      type_code: "PN",
      from_date: "2026-07-10",
      to_date: "2026-07-11",
      days: 2,
      reason: "Việc gia đình",
      status: "pending",
      current_step: 1,
      created_at: "2026-07-08T10:00:00Z",
    },
    {
      id: 2,
      employee_id: 5,
      employee_name: EMPLOYEES[4]?.name ?? "NV",
      employee_code: EMPLOYEES[4]?.code ?? "0005",
      type_code: "PB",
      from_date: "2026-07-14",
      to_date: "2026-07-14",
      days: 1,
      reason: "Khám sức khỏe",
      status: "approved",
      current_step: 2,
      created_at: "2026-07-12T08:00:00Z",
    },
  ];
}

function mockRewards(period: string) {
  return [
    {
      id: 1,
      employee_id: 1,
      employee_name: EMPLOYEES[0].name,
      employee_code: EMPLOYEES[0].code,
      period,
      type: "kpi_bonus",
      amount: 500_000,
      reason: "KPI xuất sắc",
      status: "approved",
      proposed_by: 1,
      proposed_by_name: "HR",
      approved_by: 1,
      approved_by_name: "Mr. Trung",
      approved_at: "2026-07-01T10:00:00Z",
      created_at: "2026-06-28T08:00:00Z",
    },
    {
      id: 2,
      employee_id: 3,
      employee_name: EMPLOYEES[2]?.name ?? "NV",
      employee_code: EMPLOYEES[2]?.code ?? "0003",
      period,
      type: "hot_bonus",
      amount: 300_000,
      reason: "Hoàn thành dự án gấp",
      status: "pending",
      proposed_by: 2,
      proposed_by_name: "HR",
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      created_at: "2026-07-10T14:00:00Z",
    },
  ];
}

function mockDailyReports(date: string) {
  const workers = EMPLOYEES.filter(
    (e) => e.status === "Đang làm việc" && e.position !== "Tổ trưởng" && e.position !== "Xưởng trưởng",
  );
  const subset = workers.slice(0, 12);
  return subset.map((e, i) => {
    const qty = 20 + Math.floor(Math.random() * 40);
    const ng = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
    const statuses: Array<"pending" | "verified" | "rejected"> = ["pending", "verified", "verified", "verified", "pending"];
    const status = statuses[i % statuses.length];
    return {
      id: i + 1,
      employee_id: i + 1,
      employee_name: e.name,
      employee_code: e.code,
      department_name: e.department,
      date,
      content: [
        "Gia công chi tiết khuôn mẫu theo bản vẽ KH-2026-047",
        "Phay CNC lô sản phẩm P-1205, hoàn thành đúng tiến độ",
        "Tiện chi tiết trục chính, đạt dung sai yêu cầu",
        "Cắt dây 15 chi tiết theo đơn hàng DH-0620",
        "Xử lý bề mặt lô hàng xuất 30/07",
        "Hàn khung thép + kiểm tra mối hàn",
        "Dập 200 chi tiết bu-lông M10",
        "QC kiểm tra lô hàng XK-07, đánh dấu 2 lỗi nhỏ",
        "Bảo trì máy CNC-04, thay dao phay",
        "Cắt laser tấm thép 5mm theo file DXF",
        "Tiện CNC bạc đạn Ø25, đạt Ra 0.8",
        "Nhuộm đen lô chi tiết 150 cái",
      ][i % 12],
      quantity: qty,
      ng_count: ng,
      note: ng > 0 ? "Lỗi kích thước ngoài dung sai" : null,
      status,
      submitted_at: `${date}T${String(7 + Math.floor(i / 3)).padStart(2, "0")}:${String(15 + (i * 7) % 45).padStart(2, "0")}:00Z`,
      verified_by: status !== "pending" ? 1 : null,
      verified_by_name: status === "verified" ? "Nguyễn Văn Thiện" : status === "rejected" ? "Nguyễn Văn Thiện" : null,
      verified_at: status !== "pending" ? `${date}T17:00:00Z` : null,
    };
  });
}

function mockImprovementPlans(period: string) {
  return [
    {
      id: 1,
      employee_id: 10,
      employee_name: EMPLOYEES[9]?.name ?? "NV",
      employee_code: EMPLOYEES[9]?.code ?? "0010",
      period,
      kpi_score: 45,
      step: "remind",
      note: "Cần cải thiện năng suất",
      status: "active",
      created_at: "2026-07-01T08:00:00Z",
    },
  ];
}

type MockRoute = {
  match: RegExp;
  method?: string;
  handler: (path: string, params: URLSearchParams, body: unknown) => unknown;
};

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function blockColorFor(block: string): string {
  const found = getDepartments().find((d) => d.block === block);
  return found?.block_color ?? "#1e6fd0";
}

const MOCK_ROUTES: MockRoute[] = [
  {
    match: /^\/auth\/login$/,
    handler: () => {
      return null;
    },
  },
  {
    match: /^\/auth\/me$/,
    handler: () => {
      const du = getDemoUser();
      if (du) return { user: du };
      const acc = Object.values(ACCOUNTS)[0];
      return {
        user: {
          id: 1,
          employee_id: 1,
          phone: acc.phone,
          role: acc.role,
          name: acc.name,
        },
      };
    },
  },
  {
    match: /^\/auth\/logout$/,
    handler: () => ({ success: true }),
  },
  {
    match: /^\/employees$/,
    handler: (_path, params) => {
      const page = Number(params.get("page") || 1);
      const pageSize = Number(params.get("pageSize") || 20);
      const search = params.get("search")?.toLowerCase();
      const departmentId = params.get("departmentId");
      let list = apiEmployees;
      if (search) {
        list = list.filter(
          (e) => e.name.toLowerCase().includes(search) || e.code.toLowerCase().includes(search),
        );
      }
      if (departmentId) {
        list = list.filter((e) => e.department_id === Number(departmentId));
      }
      const total = list.length;
      const start = (page - 1) * pageSize;
      return {
        data: list.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  },
  {
    match: /^\/employees\/(\d+)$/,
    handler: (path) => {
      const id = Number(path.split("/").pop());
      const emp = apiEmployees[id - 1];
      const src = EMPLOYEES[id - 1];
      return {
        employee: emp ?? apiEmployees[0],
        compensation: src
          ? {
              id: 1,
              employee_id: id,
              base_salary: src.baseSalary,
              allowance: src.allowance,
              dependents: src.dependents,
              effective_from: "2026-01-01",
            }
          : null,
        insurance: src
          ? {
              id: 1,
              employee_id: id,
              status: src.insStatus || "active",
              ins_code: src.insCode || null,
              bhxh_book: src.bhxhBook || null,
              bhyt_code: src.bhytCode || null,
              bhyt_clinic: src.bhytClinic || null,
              start_date: src.insStartDate || null,
              salary_base: src.insSalaryBase || 0,
            }
          : null,
      };
    },
  },
  {
    match: /^\/departments$/,
    method: "GET",
    handler: () => ({ data: sortedDepartments() }),
  },
  {
    match: /^\/departments$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const name = String(b.name ?? "").trim();
      const block = String(b.block ?? "").trim();
      const list = getDepartments();
      const nextId = list.reduce((max, d) => Math.max(max, d.id), 0) + 1;
      const dept: ApiDept = {
        id: nextId,
        name,
        block,
        block_color: (b.blockColor as string) || blockColorFor(block),
        head_employee_id: (b.headEmployeeId as number) ?? null,
        parent_id: null,
        employee_count: 0,
      };
      list.push(dept);
      persistDepartments();
      return { id: nextId };
    },
  },
  {
    match: /^\/departments\/(\d+)$/,
    method: "PUT",
    handler: (path, _params, body) => {
      const id = Number(path.split("/").pop());
      const b = parseBody(body);
      const dept = getDepartments().find((d) => d.id === id);
      if (!dept) return { success: false };
      if (b.name !== undefined) dept.name = String(b.name).trim();
      if (b.block !== undefined) {
        dept.block = String(b.block).trim();
        dept.block_color = (b.blockColor as string) || blockColorFor(dept.block);
      }
      if (b.headEmployeeId !== undefined) dept.head_employee_id = (b.headEmployeeId as number) ?? null;
      persistDepartments();
      return { success: true };
    },
  },
  {
    match: /^\/departments\/(\d+)$/,
    method: "DELETE",
    handler: (path) => {
      const id = Number(path.split("/").pop());
      _departments = getDepartments().filter((d) => d.id !== id);
      persistDepartments();
      return { success: true };
    },
  },
  {
    match: /^\/attendance$/,
    handler: (_path, params) => {
      const period = params.get("period") || "2026-06";
      return { data: mockAttendance(period), period };
    },
  },
  {
    match: /^\/salary$/,
    handler: (_path, params) => {
      const period = params.get("period") || "2026-06";
      return { data: mockSalaryRows(), period };
    },
  },
  {
    match: /^\/kpi$/,
    handler: (_path, params) => {
      const period = params.get("period") || "2026-06";
      return { data: mockKpi(period), period };
    },
  },
  {
    match: /^\/leave\/requests$/,
    handler: () => ({ data: mockLeaveRequests() }),
  },
  {
    match: /^\/leave\/balance\/\d+$/,
    handler: () => ({
      data: { id: 1, employee_id: 1, year: 2026, entitled: 12, carried: 2, used: 3, pending: 1 },
    }),
  },
  {
    match: /^\/rewards$/,
    handler: (_path, params) => {
      const period = params.get("period") || "2026-06";
      return { data: mockRewards(period) };
    },
  },
  {
    match: /^\/improvement-plans$/,
    handler: (_path, params) => {
      const period = params.get("period") || "2026-06";
      return { data: mockImprovementPlans(period) };
    },
  },
  {
    match: /^\/reports$/,
    handler: (_path, params) => {
      const date = params.get("date") || "2026-07-15";
      return { data: mockDailyReports(date) };
    },
  },
  {
    match: /^\/reports\/\d+$/,
    handler: () => ({ success: true, status: "verified" }),
  },
  {
    match: /^\/config$/,
    handler: () => ({ data: {} }),
  },
  {
    match: /^\/permissions$/,
    handler: () => ({ data: [] }),
  },
];

export function mockResolve(fullPath: string, method: string = "GET", body?: unknown): unknown | null {
  const [pathPart, queryPart] = fullPath.split("?");
  const params = new URLSearchParams(queryPart || "");

  for (const route of MOCK_ROUTES) {
    if (route.method && route.method !== method) continue;
    if (route.match.test(pathPart)) {
      return route.handler(pathPart, params, body);
    }
  }
  return null;
}

let _demoMode = false;
type DemoUser = { id: number; employee_id: number | null; phone: string; role: string; name: string };
let _demoUser: DemoUser | null = null;

export function isDemoMode(): boolean {
  return _demoMode;
}

export function enableDemoMode() {
  _demoMode = true;
}

export function setDemoUser(user: DemoUser | null) {
  _demoUser = user;
  try {
    if (user) window.localStorage.setItem("hrm_demo_user", JSON.stringify(user));
    else window.localStorage.removeItem("hrm_demo_user");
  } catch { /* ignore */ }
}

export function getDemoUser(): DemoUser | null {
  if (_demoUser) return _demoUser;
  try {
    const stored = window.localStorage.getItem("hrm_demo_user");
    if (stored) {
      _demoUser = JSON.parse(stored);
      return _demoUser;
    }
  } catch { /* ignore */ }
  return null;
}
