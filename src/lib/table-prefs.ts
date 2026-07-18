"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-table column visibility preferences, persisted to localStorage so each
 * user's choice of which columns to show/hide survives reloads.
 */

const STORE_PREFIX = "hrm_cols_";

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
}

function loadHidden(tableKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + tableKey);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

export function useColumnPrefs<Row>(tableKey: string, columns: ColumnDef<Row>[]) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // Load persisted prefs after mount (avoids SSR/localStorage mismatch)
  useEffect(() => {
    const stored = loadHidden(tableKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init from storage
    setHidden(
      stored.size
        ? stored
        : new Set(columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        window.localStorage.setItem(STORE_PREFIX + tableKey, JSON.stringify([...next]));
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
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    const next = new Set(columns.filter((c) => c.defaultHidden && !c.locked).map((c) => c.id));
    setHidden(next);
    persist(next);
  }, [columns, persist]);

  const isVisible = useCallback((id: string) => !hidden.has(id), [hidden]);
  const visibleColumns = columns.filter((c) => !hidden.has(c.id));

  return { hidden, toggle, reset, isVisible, visibleColumns };
}
