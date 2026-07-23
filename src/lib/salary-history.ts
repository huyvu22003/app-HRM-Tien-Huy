"use client";

/**
 * Lịch sử tăng lương theo từng nhân viên (khoá theo mã NV).
 *
 * Mỗi lần điều chỉnh lương lưu lại: ngày hiệu lực, mức lương cơ bản mới,
 * phụ cấp mới (tuỳ chọn) và lý do. Khi tính lương chỉ dùng lần điều chỉnh
 * MỚI NHẤT (theo ngày hiệu lực) — xem `getEffectiveComp`.
 *
 * Lưu vào localStorage để hoạt động ngay ở chế độ demo, đồng nhất với
 * cách `photo-store.ts` / `custom-fields.ts` đang làm.
 */

const STORE_KEY = "hrm_salary_history";

export interface SalaryRaise {
  id: string;
  /** Mã nhân viên (khoá liên kết ổn định). */
  employeeCode: string;
  /** Ngày được tăng / ngày hiệu lực (YYYY-MM-DD). */
  effectiveDate: string;
  /** Mức lương cơ bản mới. */
  baseSalary: number;
  /** Phụ cấp mới (nếu có thay đổi). */
  allowance?: number | null;
  /** Lý do tăng lương. */
  reason: string;
  /** Thời điểm nhập bản ghi (ISO). */
  createdAt: string;
}

type Store = Record<string, SalaryRaise[]>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** So sánh để xếp lần tăng mới nhất lên đầu (ngày hiệu lực giảm dần). */
function byNewestFirst(a: SalaryRaise, b: SalaryRaise): number {
  if (a.effectiveDate !== b.effectiveDate) return a.effectiveDate < b.effectiveDate ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

/** Danh sách lịch sử tăng lương của một nhân viên, mới nhất trước. */
export function getRaises(employeeCode: string): SalaryRaise[] {
  const list = readStore()[employeeCode] ?? [];
  return [...list].sort(byNewestFirst);
}

/** Lần điều chỉnh lương mới nhất (hoặc null nếu chưa có). */
export function getLatestRaise(employeeCode: string): SalaryRaise | null {
  const list = getRaises(employeeCode);
  return list.length ? list[0] : null;
}

/**
 * Mức lương/phụ cấp có hiệu lực để tính lương: lấy từ lần điều chỉnh mới
 * nhất; nếu chưa có lịch sử thì dùng giá trị gốc truyền vào.
 */
export function getEffectiveComp(
  employeeCode: string,
  fallbackBase: number,
  fallbackAllowance: number,
): { baseSalary: number; allowance: number } {
  const latest = getLatestRaise(employeeCode);
  if (!latest) return { baseSalary: fallbackBase, allowance: fallbackAllowance };
  return {
    baseSalary: latest.baseSalary,
    allowance: latest.allowance != null ? latest.allowance : fallbackAllowance,
  };
}

/** Thêm một lần điều chỉnh lương. Trả về bản ghi vừa tạo. */
export function addRaise(
  input: Omit<SalaryRaise, "id" | "createdAt">,
): SalaryRaise {
  const store = readStore();
  const raise: SalaryRaise = {
    ...input,
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  store[input.employeeCode] = [...(store[input.employeeCode] ?? []), raise];
  writeStore(store);
  return raise;
}

/** Xoá một lần điều chỉnh lương theo id. */
export function deleteRaise(employeeCode: string, id: string) {
  const store = readStore();
  const list = store[employeeCode];
  if (!list) return;
  store[employeeCode] = list.filter((r) => r.id !== id);
  writeStore(store);
}
