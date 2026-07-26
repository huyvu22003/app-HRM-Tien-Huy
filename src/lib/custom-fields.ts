"use client";

/**
 * Cột tùy chỉnh (user-defined columns) cho danh sách nhân viên.
 *
 * Định nghĩa cột + giá trị được lưu ở MÁY CHỦ qua API (`/custom-fields`,
 * `/custom-fields/values`, `/employees/:id/custom-values`) nên không mất khi
 * đăng xuất / đổi trình duyệt / đổi máy. Ở chế độ demo (chưa deploy backend),
 * lớp `mock-api` tự phục vụ các route này bằng localStorage.
 *
 * Để phần render bảng vẫn đọc đồng bộ được, module giữ một bộ nhớ đệm
 * (cache) được nạp bằng `hydrateCustomData()`; các getter đọc từ cache.
 */

import {
  fetchCustomFields,
  createCustomFieldApi,
  deleteCustomFieldApi,
  fetchCustomValues,
  saveCustomValuesApi,
  type CustomValuesMap,
} from "@/lib/api";

export type CustomFieldType = "text" | "number" | "select" | "date";

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[]; // cho type "select"
}

// --- Bộ nhớ đệm phía client ---
let _fields: CustomField[] = [];
let _values: CustomValuesMap = {};
let _hydrated = false;

/** Nạp định nghĩa cột + toàn bộ giá trị từ máy chủ vào cache. */
export async function hydrateCustomData(force = false): Promise<void> {
  if (_hydrated && !force) return;
  try {
    const [defs, vals] = await Promise.all([fetchCustomFields(), fetchCustomValues()]);
    _fields = defs.data ?? [];
    _values = vals.data ?? {};
    _hydrated = true;
  } catch {
    // Giữ nguyên cache hiện có nếu lỗi mạng.
  }
}

export function getCustomFields(): CustomField[] {
  return _fields;
}

export async function addCustomField(field: Omit<CustomField, "id">): Promise<CustomField> {
  const created = await createCustomFieldApi({
    label: field.label,
    type: field.type,
    options: field.options,
  });
  const normalized: CustomField = {
    id: created.id,
    label: created.label,
    type: created.type,
    options: created.options,
  };
  _fields = [..._fields, normalized];
  return normalized;
}

export async function removeCustomField(id: string): Promise<void> {
  await deleteCustomFieldApi(id);
  _fields = _fields.filter((f) => f.id !== id);
  for (const empId of Object.keys(_values)) {
    if (_values[empId] && id in _values[empId]) {
      const next = { ..._values[empId] };
      delete next[id];
      _values[empId] = next;
    }
  }
}

export function getCustomValue(employeeId: number | string, fieldId: string): string {
  return _values[String(employeeId)]?.[fieldId] ?? "";
}

export function getCustomValues(employeeId: number | string): Record<string, string> {
  return _values[String(employeeId)] ?? {};
}

export async function setCustomValues(
  employeeId: number | string,
  fieldValues: Record<string, string>,
): Promise<void> {
  await saveCustomValuesApi(employeeId, fieldValues);
  const key = String(employeeId);
  _values[key] = { ...(_values[key] ?? {}), ...fieldValues };
}
