"use client";

import { useCallback, useState } from "react";

/**
 * Per-table column preferences (visibility + order + reorder lock), persisted
 * to localStorage so each user's layout survives reloads.
 */

const HIDE_PREFIX = "hrm_cols_";
const ORDER_PREFIX = "hrm_colorder_";
const LOCK_PREFIX = "hrm_collock_";
const LABEL_PREFIX = "hrm_collabels_";

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
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Distinguish "never saved" from "saved empty" for the hidden set. */
function loadHidden<Row>(tableKey: string, columns: ColumnDef<Row>[]): Set<string> {
  const defaults = () => new Set(columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id));
  if (typeof window === "undefined") return defaults();
  const raw = window.localStorage.getItem(HIDE_PREFIX + tableKey);
  if (raw === null) return defaults(); // never saved → apply defaults
  try {
    return new Set(JSON.parse(raw) as string[]); // saved (even if empty) → honour it
  } catch {
    return defaults();
  }
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
  // Initialise synchronously from localStorage (this screen only renders
  // client-side, so there is no SSR/hydration mismatch to worry about).
  const [hidden, setHidden] = useState<Set<string>>(() => loadHidden(tableKey, columns));
  const [order, setOrderState] = useState<string[]>(() => readJson<string[]>(ORDER_PREFIX + tableKey, []));
  const [reorderLocked, setReorderLocked] = useState(() => readJson<boolean>(LOCK_PREFIX + tableKey, true));
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    readJson<Record<string, string>>(LABEL_PREFIX + tableKey, {}),
  );

  const renameColumn = useCallback(
    (id: string, label: string) => {
      setLabels((prev) => {
        const next = { ...prev };
        if (label.trim()) next[id] = label.trim();
        else delete next[id];
        try {
          window.localStorage.setItem(LABEL_PREFIX + tableKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [tableKey],
  );

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
    setLabels({});
    try {
      window.localStorage.removeItem(LABEL_PREFIX + tableKey);
    } catch {
      /* ignore */
    }
  }, [columns, persistHidden, persistOrder, tableKey]);

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

  const ordered = applyOrder(columns, order).map((c) =>
    labels[c.id] ? { ...c, label: labels[c.id] } : c,
  );

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
    renameColumn,
  };
}
