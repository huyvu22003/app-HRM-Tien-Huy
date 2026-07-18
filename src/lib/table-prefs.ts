"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-table column preferences (visibility + order + reorder lock), persisted
 * to localStorage so each user's layout survives reloads.
 */

const HIDE_PREFIX = "hrm_cols_";
const ORDER_PREFIX = "hrm_colorder_";
const LOCK_PREFIX = "hrm_collock_";

export interface ColumnDef<Row> {
  id: string;
  label: string;
  /** When true the column can never be hidden (e.g. name, actions). */
  locked?: boolean;
  /** Hidden by default until the user opts in. */
  defaultHidden?: boolean;
  align?: "left" | "right" | "center";
  /** Cell renderer for the on-screen table. */
  cell: (row: Row, index: number) => React.ReactNode;
  /** Header extra class (width, alignment). */
  headClass?: string;
  cellClass?: string;
  /** Value used when exporting to CSV/Excel. Falls back to no export column. */
  exportValue?: (row: Row, index: number) => string | number;
  /** Number format for styled Excel export. */
  exportFormat?: "money" | "int" | "text";
  /** Excludes the column from drag-reordering and per-column filtering (e.g. actions). */
  noReorder?: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Order a column list by a saved id order; unknown ids keep their natural spot. */
function applyOrder<Row>(columns: ColumnDef<Row>[], order: string[]): ColumnDef<Row>[] {
  if (order.length === 0) return columns;
  const byId = new Map(columns.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: ColumnDef<Row>[] = [];
  for (const id of order) {
    const c = byId.get(id);
    if (c) {
      out.push(c);
      seen.add(id);
    }
  }
  // Append any columns not present in the saved order (new/custom columns)
  for (const c of columns) if (!seen.has(c.id)) out.push(c);
  return out;
}

export function useColumnPrefs<Row>(tableKey: string, columns: ColumnDef<Row>[]) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [order, setOrderState] = useState<string[]>([]);
  const [reorderLocked, setReorderLocked] = useState(true);

  useEffect(() => {
    const storedHidden = readJson<string[]>(HIDE_PREFIX + tableKey, []);
    const storedOrder = readJson<string[]>(ORDER_PREFIX + tableKey, []);
    const storedLock = readJson<boolean>(LOCK_PREFIX + tableKey, true);
    /* eslint-disable react-hooks/set-state-in-effect -- init from storage */
    setHidden(
      storedHidden.length
        ? new Set(storedHidden)
        : new Set(columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id)),
    );
    setOrderState(storedOrder);
    setReorderLocked(storedLock);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  const persistHidden = useCallback(
    (next: Set<string>) => {
      try {
        window.localStorage.setItem(HIDE_PREFIX + tableKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [tableKey],
  );

  const persistOrder = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(ORDER_PREFIX + tableKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [tableKey],
  );

  const toggle = useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persistHidden(next);
        return next;
      });
    },
    [persistHidden],
  );

  const reset = useCallback(() => {
    const next = new Set(columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id));
    setHidden(next);
    persistHidden(next);
    setOrderState([]);
    persistOrder([]);
  }, [columns, persistHidden, persistOrder]);

  const toggleReorderLock = useCallback(() => {
    setReorderLocked((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LOCK_PREFIX + tableKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [tableKey]);

  const ordered = applyOrder(columns, order);

  /** Move column `dragId` to sit where `targetId` is. */
  const moveColumn = useCallback(
    (dragId: string, targetId: string) => {
      if (dragId === targetId) return;
      const ids = ordered.map((c) => c.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      ids.splice(from, 1);
      ids.splice(to, 0, dragId);
      setOrderState(ids);
      persistOrder(ids);
    },
    [ordered, persistOrder],
  );

  const isVisible = useCallback((id: string) => !hidden.has(id), [hidden]);
  const visibleColumns = ordered.filter((c) => !hidden.has(c.id));

  return {
    hidden,
    toggle,
    reset,
    isVisible,
    visibleColumns,
    orderedColumns: ordered,
    reorderLocked,
    toggleReorderLock,
    moveColumn,
  };
}
