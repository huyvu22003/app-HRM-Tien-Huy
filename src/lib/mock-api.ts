"use client";

import { EMPLOYEES } from "@/lib/data/employees";
import { DEPARTMENTS, BLOCK_ORDER } from "@/lib/data/departments";
import { ACCOUNTS } from "@/lib/data/accounts";
import {
  insertManagerPreview,
  removeManagerPreview,
  type OrgPerson,
} from "@/lib/org-hierarchy";
import { getEffectiveComp, getLatestRaise } from "@/lib/salary-history";

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
    manager_employee_id: null,
    manager_name: e.manager && e.manager !== "-" ? e.manager : null,
    level: e.level || null,
    photo_url: null,
    bank: e.bank || null,
    tax_code: e.taxCode || null,
    updated_at: "2026-07-19 00:00:00",
    dependents: e.dependents ?? 0,
    base_salary: e.baseSalary ?? null,
    allowance: e.allowance ?? null,
    responsibility_salary: null,
    gas_allowance: null,
    attendance_bonus: null,
    ins_status: e.insStatus || null,
    ins_salary_base: e.insSalaryBase ?? null,
    resign_reason: null, contract_date_1: null, contract_date_2: null, contract_date_3: null,
    birth_year: null, birth_place: null, education: null, specialization: null, temp_address: null,
    cccd_issue_date: null, cccd_issue_place: null, nationality: null, religion: null, ethnicity: null,
    bank_account: null, bank_branch: null, bhxh_no: null, bhxh_increase_date: null,
    bhxh_decrease_date: null, relative_name: null, relative_relation: null, relative_phone: null,
  };
}

type ApiEmp = {
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
  dependents: number | null;
  base_salary: number | null;
  allowance: number | null;
  responsibility_salary: number | null;
  gas_allowance: number | null;
  attendance_bonus: number | null;
  ins_status: string | null;
  ins_salary_base: number | null;
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
};

const baseEmployees: ApiEmp[] = EMPLOYEES.map(toApiEmployee);
for (const employee of baseEmployees) {
  if (!employee.manager_name) continue;
  const matches = baseEmployees.filter((candidate) => candidate.name === employee.manager_name);
  if (matches.length === 1) employee.manager_employee_id = matches[0].id;
}

const HIERARCHY_OVERRIDE_KEY = "hrm_demo_hierarchy_overrides";
function loadHierarchyOverrides(): Record<string, number | null> {
  try {
    return JSON.parse(window.localStorage.getItem(HIERARCHY_OVERRIDE_KEY) || "{}") as Record<string, number | null>;
  } catch {
    return {};
  }
}

function saveHierarchyOverrides(value: Record<string, number | null>) {
  try {
    window.localStorage.setItem(HIERARCHY_OVERRIDE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// Employees added at runtime (e.g. via import) — persisted so demo survives reload.
const ADDED_EMP_KEY = "hrm_demo_added_employees";
let _addedEmployees: ApiEmp[] | null = null;

function loadAddedEmployees(): ApiEmp[] {
  try {
    const raw = window.localStorage.getItem(ADDED_EMP_KEY);
    if (raw) return JSON.parse(raw) as ApiEmp[];
  } catch {
    /* ignore */
  }
  return [];
}

function addedEmployees(): ApiEmp[] {
  if (!_addedEmployees) _addedEmployees = loadAddedEmployees();
  return _addedEmployees;
}

function persistAddedEmployees() {
  try {
    window.localStorage.setItem(ADDED_EMP_KEY, JSON.stringify(addedEmployees()));
  } catch {
    /* ignore */
  }
}

function allEmployees(): ApiEmp[] {
  const overrides = loadHierarchyOverrides();
  const all = baseEmployees.concat(addedEmployees());
  const names = new Map(all.map((employee) => [employee.id, employee.name]));
  return all.map((employee) => {
    if (!(String(employee.id) in overrides)) return employee;
    const managerId = overrides[String(employee.id)] ?? null;
    return {
      ...employee,
      manager_employee_id: managerId,
      manager_name: managerId ? names.get(managerId) ?? null : null,
      manager: managerId ? names.get(managerId) ?? null : null,
    };
  });
}

function nextEmployeeId(): number {
  return allEmployees().reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

function makeImportedEmployee(input: Record<string, unknown>, id: number): ApiEmp {
  const deptName = String(input.department_name ?? input.department ?? "").trim();
  const dept = getDepartments().find((d) => d.name === deptName);
  return {
    id,
    code: String(input.code ?? `NV${id}`),
    name: String(input.name ?? ""),
    gender: (input.gender as string) || null,
    dob: (input.dob as string) || null,
    phone: (input.phone as string) || null,
    cccd: (input.cccd as string) || null,
    address: (input.address as string) || null,
    email: (input.email as string) || null,
    department_id: dept?.id ?? null,
    department_name: deptName || null,
    position: (input.position as string) || null,
    workplace: (input.workplace as string) || null,
    contract_type: (input.contract_type as string) || null,
    contract_end: (input.contract_end as string) || null,
    join_date: (input.join_date as string) || null,
    resign_request_date: null,
    resign_date: null,
    status: (input.status as string) || "Đang làm việc",
    manager: (input.manager as string) || null,
    manager_employee_id: null,
    manager_name: (input.manager as string) || null,
    level: (input.level as string) || null,
    photo_url: null,
    bank: (input.bank as string) || null,
    tax_code: (input.tax_code as string) || null,
    updated_at: new Date().toISOString(),
    dependents: (input.dependents as number) ?? 0,
    base_salary: (input.base_salary as number) ?? null,
    allowance: (input.allowance as number) ?? null,
    responsibility_salary: (input.responsibility_salary as number) ?? null,
    gas_allowance: (input.gas_allowance as number) ?? null,
    attendance_bonus: (input.attendance_bonus as number) ?? null,
    ins_status: (input.ins_status as string) || null,
    ins_salary_base: (input.ins_salary_base as number) ?? null,
    resign_reason: (input.resign_reason as string) || null,
    contract_date_1: (input.contract_date_1 as string) || null,
    contract_date_2: (input.contract_date_2 as string) || null,
    contract_date_3: (input.contract_date_3 as string) || null,
    birth_year: (input.birth_year as string) || null,
    birth_place: (input.birth_place as string) || null,
    education: (input.education as string) || null,
    specialization: (input.specialization as string) || null,
    temp_address: (input.temp_address as string) || null,
    cccd_issue_date: (input.cccd_issue_date as string) || null,
    cccd_issue_place: (input.cccd_issue_place as string) || null,
    nationality: (input.nationality as string) || null,
    religion: (input.religion as string) || null,
    ethnicity: (input.ethnicity as string) || null,
    bank_account: (input.bank_account as string) || null,
    bank_branch: (input.bank_branch as string) || null,
    bhxh_no: (input.bhxh_no as string) || null,
    bhxh_increase_date: (input.bhxh_increase_date as string) || null,
    bhxh_decrease_date: (input.bhxh_decrease_date as string) || null,
    relative_name: (input.relative_name as string) || null,
    relative_relation: (input.relative_relation as string) || null,
    relative_phone: (input.relative_phone as string) || null,
  };
}

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
  // Tạo bảng lương demo cho TẤT CẢ nhân viên đang làm việc (khớp số nhân sự),
  // không giới hạn 20 người như trước.
  return EMPLOYEES.filter((e) => e.status === "Đang làm việc").map((e, i) => {
    // Chỉ lấy mức lương của lần điều chỉnh mới nhất để tính lương.
    const eff = getEffectiveComp(e.code, e.baseSalary || 8_000_000, e.allowance || 300_000);
    const base = eff.baseSalary || 8_000_000;
    return {
      employee_id: i + 1,
      code: e.code,
      name: e.name,
      department_id: DEPARTMENTS.findIndex((d) => d.name === e.department) + 1,
      department_name: e.department,
      base_salary: base,
      allowance: eff.allowance || 300_000,
      responsibility_salary: 0,
      gas_allowance: 200_000,
      attendance_bonus: 450_000,
      union_dues: 50_000,
      dependents: e.dependents || 0,
      kpi_bonus: 0,
      hot_bonus: 0,
      advance: 0,
      advance_ck: 0,
      advance_tm: 0,
      company_debt: 0,
      pay_method: e.bank ? "CK" : "TM",
      merge_into: null,
      bank: e.bank || null,
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
  // Chấm công demo cho tất cả nhân viên đang làm việc (khớp số nhân sự).
  return EMPLOYEES.filter((e) => e.status === "Đang làm việc").map((e, i) => ({
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

// --- Cột tùy chỉnh (demo: lưu localStorage; production: bảng D1) ---
const CF_DEFS_KEY = "hrm_custom_fields";
const CF_VALUES_KEY = "hrm_custom_field_values";

interface MockCustomField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
}
type MockValuesMap = Record<string, Record<string, string>>;

function cfRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function cfWrite(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function cfDefs(): MockCustomField[] {
  return cfRead<MockCustomField[]>(CF_DEFS_KEY, []);
}

function cfValues(): MockValuesMap {
  return cfRead<MockValuesMap>(CF_VALUES_KEY, {});
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
    match: /^\/org\/hierarchy$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const input = parseBody(body);
      const employees = allEmployees();
      const people: OrgPerson[] = employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        departmentId: employee.department_id,
        departmentName: employee.department_name,
        position: employee.position,
        level: employee.level,
        managerEmployeeId: employee.manager_employee_id,
        managerName: employee.manager_name,
        phone: employee.phone,
      }));
      let updates: Array<{ employeeId: number; managerEmployeeId: number | null }> = [];
      if (input.action === "move") {
        updates = [{
          employeeId: Number(input.employeeId),
          managerEmployeeId: input.managerEmployeeId == null ? null : Number(input.managerEmployeeId),
        }];
      } else if (input.action === "insert") {
        updates = insertManagerPreview(people, {
          candidateId: Number(input.candidateId),
          branchRootId: Number(input.branchRootId),
        }).updates;
      } else if (input.action === "remove-level") {
        updates = removeManagerPreview(people, Number(input.employeeId)).updates;
      }
      const overrides = loadHierarchyOverrides();
      for (const update of updates) overrides[String(update.employeeId)] = update.managerEmployeeId;
      saveHierarchyOverrides(overrides);
      return { success: true, affectedEmployeeIds: updates.map((update) => update.employeeId) };
    },
  },
  {
    match: /^\/employees$/,
    method: "GET",
    handler: (_path, params) => {
      const page = Number(params.get("page") || 1);
      const pageSize = Number(params.get("pageSize") || 20);
      const search = params.get("search")?.toLowerCase();
      const departmentId = params.get("departmentId");
      let list = allEmployees();
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
    match: /^\/employees$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const emp = makeImportedEmployee(b, nextEmployeeId());
      addedEmployees().push(emp);
      persistAddedEmployees();
      return { id: emp.id };
    },
  },
  {
    match: /^\/employees\/import$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const incoming = Array.isArray(b.employees) ? (b.employees as Record<string, unknown>[]) : [];
      let created = 0;
      let updated = 0;
      for (const input of incoming) {
        const code = String(input.code ?? "").trim();
        const existing = code ? allEmployees().find((e) => e.code === code) : undefined;
        if (existing) {
          // Update in-place only if it's a runtime-added record (base is immutable in demo)
          const added = addedEmployees().find((e) => e.code === code);
          if (added) {
            Object.assign(added, makeImportedEmployee({ ...added, ...input }, added.id));
            updated++;
          } else {
            updated++; // base record — treated as matched, left as-is in demo
          }
        } else {
          addedEmployees().push(makeImportedEmployee(input, nextEmployeeId()));
          created++;
        }
      }
      persistAddedEmployees();
      return { success: true, created, updated };
    },
  },
  {
    match: /^\/employees\/(\d+)$/,
    method: "GET",
    handler: (path) => {
      const id = Number(path.split("/").pop());
      const emp = allEmployees().find((e) => e.id === id);
      const src = EMPLOYEES[id - 1];
      return {
        employee: emp ?? baseEmployees[0],
        compensation: src
          ? (() => {
              const eff = getEffectiveComp(src.code, src.baseSalary, src.allowance);
              const latest = getLatestRaise(src.code);
              return {
                id: 1,
                employee_id: id,
                base_salary: eff.baseSalary,
                allowance: eff.allowance,
                dependents: src.dependents,
                effective_from: latest?.effectiveDate ?? "2026-01-01",
              };
            })()
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
    match: /^\/employees\/(\d+)$/,
    method: "PUT",
    handler: (path, _params, body) => {
      const id = Number(path.split("/").pop());
      const added = addedEmployees().find((e) => e.id === id);
      if (added) {
        const b = parseBody(body);
        if (b.name !== undefined) added.name = String(b.name);
        if (b.departmentName !== undefined) {
          const dept = getDepartments().find((d) => d.name === b.departmentName);
          added.department_name = (b.departmentName as string) || null;
          added.department_id = dept?.id ?? null;
        }
        for (const k of ["gender", "dob", "phone", "cccd", "address", "email", "position", "workplace", "status", "manager", "level", "bank"] as const) {
          if (b[k] !== undefined) (added as Record<string, unknown>)[k] = b[k];
        }
        if (b.taxCode !== undefined) added.tax_code = (b.taxCode as string) || null;
        persistAddedEmployees();
      }
      return { success: true };
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
    match: /^\/attendance\/periods$/,
    handler: () => ({ data: ["2026-06"] }),
  },
  {
    match: /^\/attendance\/leave-suggestions/,
    method: "GET",
    handler: (_path, params) => ({ data: [], period: params.get("period") || "2026-06" }),
  },
  {
    match: /^\/attendance\/apply-leave$/,
    method: "POST",
    handler: () => ({ success: true }),
  },
  {
    match: /^\/attendance\/checkup-suggestions/,
    method: "GET",
    handler: (_path, params) => ({ data: [], period: params.get("period") || "2026-06" }),
  },
  {
    match: /^\/attendance\/apply-checkup$/,
    method: "POST",
    handler: () => ({ success: true }),
  },
  {
    match: /^\/attendance\/import$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const rows = Array.isArray(b.rows) ? b.rows : [];
      return { success: true, imported: rows.length, unmatched: [] };
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
    match: /^\/overtime$/,
    method: "GET",
    handler: (_path, params) => ({
      data: [],
      employeeId: Number(params.get("employeeId")) || 0,
      period: params.get("period") || "",
    }),
  },
  {
    match: /^\/overtime$/,
    method: "PUT",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const days = Array.isArray(b.days) ? (b.days as { hours: number }[]) : [];
      const hol = Number(b.holidayHours) || 0;
      const total = days.reduce((s, d) => s + (Number(d.hours) || 0), 0) + hol;
      return { success: true, totals: { otWeekdayHours: 0, otSundayHours: 0, otHolidayHours: hol, overtimeHours: total, mealAllowance: 0 } };
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
    method: "GET",
    handler: () => ({ data: mockLeaveRequests() }),
  },
  {
    match: /^\/leave\/requests$/,
    method: "POST",
    handler: () => ({ id: Date.now() }),
  },
  {
    match: /^\/leave\/balance\/(\d+)$/,
    handler: (path) => {
      const employeeId = Number(path.match(/\/leave\/balance\/(\d+)/)?.[1] ?? 1);
      const entitled = 12, carried = 2, used = 3, pending = 1;
      return {
        data: { employee_id: employeeId, year: new Date().getFullYear(), entitled, carried, used, pending, remaining: entitled + carried - used },
      };
    },
  },
  {
    match: /^\/maternity$/,
    method: "GET",
    handler: () => ({ data: [] }),
  },
  {
    match: /^\/maternity$/,
    method: "POST",
    handler: () => ({ id: Date.now() }),
  },
  {
    match: /^\/maternity\/\d+\/checkups$/,
    method: "PUT",
    handler: () => ({ success: true, count: 0 }),
  },
  {
    match: /^\/maternity\/\d+$/,
    method: "PUT",
    handler: () => ({ success: true }),
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
  {
    match: /^\/custom-fields$/,
    method: "GET",
    handler: () => ({ data: cfDefs() }),
  },
  {
    match: /^\/custom-fields$/,
    method: "POST",
    handler: (_path, _params, body) => {
      const b = parseBody(body);
      const label = String(b.label ?? "").trim();
      const type = b.type === "number" || b.type === "select" ? (b.type as string) : "text";
      const field: MockCustomField = {
        id: `cf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        label,
        type: type as MockCustomField["type"],
        options: type === "select" && Array.isArray(b.options) ? (b.options as string[]) : undefined,
      };
      cfWrite(CF_DEFS_KEY, [...cfDefs(), field]);
      return field;
    },
  },
  {
    match: /^\/custom-fields\/values$/,
    method: "GET",
    handler: () => ({ data: cfValues() }),
  },
  {
    match: /^\/custom-fields\/[^/]+$/,
    method: "DELETE",
    handler: (path) => {
      const id = path.split("/").pop() as string;
      cfWrite(CF_DEFS_KEY, cfDefs().filter((f) => f.id !== id));
      const values = cfValues();
      for (const empId of Object.keys(values)) {
        if (values[empId] && id in values[empId]) delete values[empId][id];
      }
      cfWrite(CF_VALUES_KEY, values);
      return { success: true };
    },
  },
  {
    match: /^\/employees\/(\d+)\/custom-values$/,
    method: "PUT",
    handler: (path, _params, body) => {
      const empId = path.split("/")[2];
      const b = parseBody(body);
      const values = cfValues();
      values[empId] = { ...(values[empId] ?? {}), ...(b as Record<string, string>) };
      cfWrite(CF_VALUES_KEY, values);
      return { success: true };
    },
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
