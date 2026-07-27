"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@/lib/table-prefs";
import { formatDate } from "@/lib/utils";
import type { AddColumnFormat } from "@/components/ui/data-table";
import {
  getCustomFields,
  addCustomField,
  removeCustomField,
  getCustomValue,
  hydrateCustomData,
  type CustomField,
} from "@/lib/custom-fields";

/**
 * Cột tùy chỉnh dùng chung cho các bảng gắn với nhân viên (Nhân viên, Chấm công,
 * Lương thưởng…). Custom field là thuộc tính theo NHÂN VIÊN nên cùng một cột hiển
 * thị đồng bộ ở mọi bảng; giá trị nhập ở màn chi tiết nhân viên.
 *
 * Trả về: danh sách cột để nối vào bảng + các handler dùng cho DataTable
 * (onAddColumn / isColumnDeletable / onDeleteColumn).
 */
export function useCustomColumns<Row>(getEmployeeId: (row: Row) => number | string) {
  const [fields, setFields] = useState<CustomField[]>(() => getCustomFields());
  const getIdRef = useRef(getEmployeeId);
  useEffect(() => {
    getIdRef.current = getEmployeeId;
  }, [getEmployeeId]);

  useEffect(() => {
    hydrateCustomData().then(() => setFields(getCustomFields()));
  }, []);

  const customColumns = useMemo<ColumnDef<Row>[]>(
    () =>
      fields.map((f) => {
        const read = (row: Row) => {
          const raw = getCustomValue(getIdRef.current(row), f.id);
          return raw && f.type === "date" ? formatDate(raw) : raw;
        };
        return {
          id: f.id,
          label: f.label,
          align: f.type === "number" ? "right" : undefined,
          cellClass: "text-[var(--color-text-muted)]",
          cell: (row: Row) => read(row) || "-",
          exportValue: (row: Row) => read(row),
          exportFormat: f.type === "number" ? "int" : "text",
        };
      }),
    [fields],
  );

  const addColumn = useCallback(async (opts: { label: string; type: AddColumnFormat }) => {
    await addCustomField({ label: opts.label, type: opts.type });
    setFields(getCustomFields());
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    await removeCustomField(id);
    await hydrateCustomData(true);
    setFields(getCustomFields());
  }, []);

  const isCustomColumn = useCallback((id: string) => id.startsWith("cf_"), []);

  return { customColumns, addColumn, deleteColumn, isCustomColumn };
}
