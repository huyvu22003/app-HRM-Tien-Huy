import type { Role } from "./accounts";

export interface RoleMeta {
  label: string;
  short: string;
  color: string;
  scope: "all" | "department" | "self";
  canEdit: boolean;
  canManage: boolean;
  nav: string[];
}

export const ROLE_META: Record<Role, RoleMeta> = {
  super: {
    label: "Quản trị viên",
    short: "Super Admin",
    color: "#0f2f5a",
    scope: "all",
    canEdit: true,
    canManage: true,
    nav: [
      "dashboard",
      "employees",
      "departments",
      "attendance",
      "leave",
      "payroll",
      "insurance",
      "reports",
      "permissions",
      "settings",
    ],
  },
  hr: {
    label: "Nhân sự",
    short: "HR",
    color: "#1e6fd0",
    scope: "all",
    canEdit: true,
    canManage: true,
    nav: [
      "dashboard",
      "employees",
      "departments",
      "attendance",
      "leave",
      "payroll",
      "insurance",
      "reports",
    ],
  },
  lead: {
    label: "Tổ trưởng",
    short: "Team Lead",
    color: "#2f8f5b",
    scope: "department",
    canEdit: false,
    canManage: true,
    nav: ["dashboard", "employees", "attendance", "leave"],
  },
  staff: {
    label: "Nhân viên",
    short: "Staff",
    color: "#7a8697",
    scope: "self",
    canEdit: false,
    canManage: false,
    nav: ["dashboard", "attendance", "leave"],
  },
};

export const DEFAULT_CFG = {
  leave: {
    annualDays: 12,
    maxCarryOver: 6,
    probationEligibleMonths: 6,
  },
  attendance: {
    workStart: "07:30",
    workEnd: "16:30",
    lateGraceMinutes: 10,
    lunchBreakMinutes: 60,
    standardWorkDaysPerMonth: 26,
  },
  insurance: {
    bhxhEmployeeRate: 0.08,
    bhytEmployeeRate: 0.015,
    bhtnEmployeeRate: 0.01,
    bhxhEmployerRate: 0.175,
    bhytEmployerRate: 0.03,
    bhtnEmployerRate: 0.01,
  },
  tax: {
    personalDeduction: 11000000,
    dependentDeduction: 4400000,
  },
};

export const LOGIN_THEMES = [
  { id: "navy", name: "Xanh Hải Quân", primary: "#0f2f5a", accent: "#1e6fd0" },
  { id: "forest", name: "Xanh Lá", primary: "#1c3d2e", accent: "#2f8f5b" },
  { id: "burgundy", name: "Đỏ Rượu Vang", primary: "#4a1f2a", accent: "#c0483c" },
  { id: "slate", name: "Xám Đá", primary: "#2c333d", accent: "#5c6a7a" },
  { id: "amber", name: "Hổ Phách", primary: "#4a3315", accent: "#c1852a" },
  { id: "plum", name: "Mận Tím", primary: "#3a1f3d", accent: "#b0508f" },
];

export const LOGIN_DEFAULT = {
  appName: "HRM Tiến Huy",
  company: "Công ty TNHH Cơ khí Khuôn mẫu Tiến Huy",
  tagline: "Hệ thống quản trị nhân sự nội bộ",
  theme: "navy",
  showDemoAccounts: true,
};

export const PERM_MODULES = [
  {
    id: "employees",
    label: "Hồ sơ nhân viên",
    actions: ["view", "create", "edit", "delete", "export"],
  },
  {
    id: "attendance",
    label: "Chấm công",
    actions: ["view", "create", "edit", "approve"],
  },
  {
    id: "leave",
    label: "Nghỉ phép",
    actions: ["view", "request", "approve", "reject"],
  },
  {
    id: "payroll",
    label: "Lương thưởng",
    actions: ["view", "edit", "approve", "export"],
  },
  {
    id: "insurance",
    label: "Bảo hiểm",
    actions: ["view", "edit", "export"],
  },
  {
    id: "settings",
    label: "Cấu hình hệ thống",
    actions: ["view", "edit"],
  },
] as const;

export const PERM_ROLE_DEFAULT: Record<Role, Record<string, string[]>> = {
  super: {
    employees: ["view", "create", "edit", "delete", "export"],
    attendance: ["view", "create", "edit", "approve"],
    leave: ["view", "request", "approve", "reject"],
    payroll: ["view", "edit", "approve", "export"],
    insurance: ["view", "edit", "export"],
    settings: ["view", "edit"],
  },
  hr: {
    employees: ["view", "create", "edit", "export"],
    attendance: ["view", "create", "edit", "approve"],
    leave: ["view", "request", "approve", "reject"],
    payroll: ["view", "edit", "export"],
    insurance: ["view", "edit", "export"],
    settings: ["view"],
  },
  lead: {
    employees: ["view"],
    attendance: ["view", "create", "approve"],
    leave: ["view", "request", "approve"],
    payroll: [],
    insurance: [],
    settings: [],
  },
  staff: {
    employees: [],
    attendance: ["view", "create"],
    leave: ["view", "request"],
    payroll: [],
    insurance: [],
    settings: [],
  },
};

// Salary formula pipeline: order in which components are applied
export const FX_ORDER = [
  "baseSalary",
  "allowance",
  "overtimeAmount",
  "grossSalary",
  "insuranceDeduction",
  "taxableIncome",
  "personalIncomeTax",
  "netSalary",
] as const;

export const FX_SRC: Record<(typeof FX_ORDER)[number], string> = {
  baseSalary: "employee.baseSalary",
  allowance: "employee.allowance",
  overtimeAmount: "overtimeHours * hourlyRate * 1.5",
  grossSalary: "baseSalary + allowance + overtimeAmount",
  insuranceDeduction: "insSalaryBase * (bhxhEmployeeRate + bhytEmployeeRate + bhtnEmployeeRate)",
  taxableIncome: "grossSalary - insuranceDeduction - personalDeduction - dependents * dependentDeduction",
  personalIncomeTax: "progressiveTax(taxableIncome)",
  netSalary: "grossSalary - insuranceDeduction - personalIncomeTax",
};

export const FX_LABEL: Record<(typeof FX_ORDER)[number], string> = {
  baseSalary: "Lương cơ bản",
  allowance: "Phụ cấp",
  overtimeAmount: "Tiền tăng ca",
  grossSalary: "Tổng thu nhập",
  insuranceDeduction: "Khấu trừ bảo hiểm",
  taxableIncome: "Thu nhập chịu thuế",
  personalIncomeTax: "Thuế TNCN",
  netSalary: "Lương thực nhận",
};

export const DEFAULT_PIT = [
  { upTo: 5000000, rate: 0.05 },
  { upTo: 10000000, rate: 0.1 },
  { upTo: 18000000, rate: 0.15 },
  { upTo: 32000000, rate: 0.2 },
  { upTo: 52000000, rate: 0.25 },
  { upTo: 80000000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

export const LEAVE_TYPES = [
  { code: "PN", label: "Phép năm", color: "#1e6fd0" },
  { code: "PB", label: "Phép bệnh", color: "#c0483c" },
  { code: "VR", label: "Việc riêng", color: "#c1852a" },
  { code: "TS", label: "Thai sản", color: "#b0508f" },
  { code: "NL", label: "Nghỉ lễ", color: "#2f8f5b" },
  { code: "KP", label: "Không phép", color: "#5c6a7a" },
];
