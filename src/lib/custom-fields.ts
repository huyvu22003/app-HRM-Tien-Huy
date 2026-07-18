"use client";

/**
 * User-defined custom columns for the employee list. Definitions and per-employee
 * values are persisted to localStorage so they survive reloads (demo). When a
 * backend custom-fields table exists, swap these read/write helpers for API calls.
 */

export type CustomFieldType = "text" | "number" | "select";

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[]; // for type "select"
}

const DEFS_KEY = "hrm_custom_fields";
const VALUES_KEY = "hrm_custom_field_values";

type ValuesMap = Record<string, Record<string, string>>; // { [employeeId]: { [fieldId]: value } }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getCustomFields(): CustomField[] {
  return read<CustomField[]>(DEFS_KEY, []);
}

export function addCustomField(field: Omit<CustomField, "id">): CustomField {
  const defs = getCustomFields();
  const created: CustomField = { ...field, id: `cf_${Date.now().toString(36)}` };
  defs.push(created);
  write(DEFS_KEY, defs);
  return created;
}

export function removeCustomField(id: string) {
  write(DEFS_KEY, getCustomFields().filter((f) => f.id !== id));
  // prune stored values for the removed field
  const values = read<ValuesMap>(VALUES_KEY, {});
  for (const empId of Object.keys(values)) {
    if (values[empId] && id in values[empId]) delete values[empId][id];
  }
  write(VALUES_KEY, values);
}

export function getCustomValue(employeeId: number | string, fieldId: string): string {
  const values = read<ValuesMap>(VALUES_KEY, {});
  return values[String(employeeId)]?.[fieldId] ?? "";
}

export function getCustomValues(employeeId: number | string): Record<string, string> {
  const values = read<ValuesMap>(VALUES_KEY, {});
  return values[String(employeeId)] ?? {};
}

export function setCustomValues(employeeId: number | string, fieldValues: Record<string, string>) {
  const values = read<ValuesMap>(VALUES_KEY, {});
  values[String(employeeId)] = { ...(values[String(employeeId)] ?? {}), ...fieldValues };
  write(VALUES_KEY, values);
}
