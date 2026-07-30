"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3, Check, RotateCcw, Trash2 } from "lucide-react";
import type { ColumnDef } from "@/lib/table-prefs";
import { cn } from "@/lib/utils";

export function ColumnMenu<Row>({
  columns,
  hidden,
  onToggle,
  onReset,
  isDeletable,
  onDeleteColumn,
}: {
  columns: ColumnDef<Row>[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  /** Cột nào được phép xoá (VD: cột tùy chỉnh). */
  isDeletable?: (col: ColumnDef<Row>) => boolean;
  /** Xoá cột trực tiếp trong menu. */
  onDeleteColumn?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shownCount = columns.filter((c) => !hidden.has(c.id)).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
      >
        <Columns3 size={14} /> Cột
        <span className="text-[11px] text-[var(--color-text-light)]">
          {shownCount}/{columns.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[230px] rounded-[10px] border border-[var(--color-border)] bg-white p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              Hiển thị cột
            </span>
            <button
              onClick={onReset}
              title="Đặt lại"
              className="flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:underline"
            >
              <RotateCcw size={11} /> Đặt lại
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {[...columns].sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, "vi")).map((c) => {
              const visible = !hidden.has(c.id);
              const deletable = !!onDeleteColumn && !!isDeletable?.(c) && !c.locked;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-[8px] pl-2 pr-1 text-left text-[12.5px]",
                    c.locked ? "text-[var(--color-text-lighter)]" : "hover:bg-[var(--color-page-bg)]",
                  )}
                >
                  <button
                    onClick={() => !c.locked && onToggle(c.id)}
                    disabled={c.locked}
                    className={cn(
                      "flex flex-1 items-center gap-2 py-1.5 text-left",
                      c.locked ? "cursor-not-allowed" : "text-[var(--color-text-secondary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border",
                        visible
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                          : "border-[var(--color-border)]",
                      )}
                    >
                      {visible && <Check size={11} />}
                    </span>
                    <span className="flex-1 truncate">{c.label || c.id}</span>
                    {c.locked && <span className="text-[10px] text-[var(--color-text-lighter)]">cố định</span>}
                  </button>
                  {deletable && (
                    <button
                      onClick={() => onDeleteColumn!(c.id)}
                      title={`Xoá cột "${c.label || c.id}"`}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[6px] text-[var(--color-text-lighter)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
