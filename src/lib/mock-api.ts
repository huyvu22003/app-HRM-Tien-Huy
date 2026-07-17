"use client";

import { EMPLOYEES } from "@/lib/data/employees";
import { DEPARTMENTS } from "@/lib/data/departments";
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

const apiDepartments = DEPARTMENTS.map(toApiDepartment);

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
  handler: (path: string, params: URLSearchParams) => unknown;
};

const MOCK_ROUTES: MockRoute[] = [
  {
    match: /^\/auth\/login$/,
    handler: () => {
      const acc = Object.values(ACCOUNTS)[0];
      return {
        token: "mock-token-" + Date.now(),
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
    match: /^\/auth\/me$/,
    handler: () => {
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
      let list = apiEmployees;
      if (search) {
        list = list.filter(
          (e) => e.name.toLowerCase().includes(search) || e.code.toLowerCase().includes(search),
        );
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
    handler: () => ({ data: apiDepartments }),
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
    match: /^\/config$/,
    handler: () => ({ data: {} }),
  },
  {
    match: /^\/permissions$/,
    handler: () => ({ data: [] }),
  },
];

export function mockResolve(fullPath: string): unknown | null {
  const [pathPart, queryPart] = fullPath.split("?");
  const params = new URLSearchParams(queryPart || "");

  for (const route of MOCK_ROUTES) {
    if (route.match.test(pathPart)) {
      return route.handler(pathPart, params);
    }
  }
  return null;
}

let _demoMode = false;

export function isDemoMode(): boolean {
  return _demoMode;
}

export function enableDemoMode() {
  _demoMode = true;
}
