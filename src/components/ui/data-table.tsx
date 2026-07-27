"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GripVertical,
  MoreVertical,
  ArrowDownAZ,
  ArrowUpAZ,
  Pencil,
  Plus,
  Type,
  Hash,
  Calendar,
  X,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { cn } from "@/lib/utils";

export type AddColumnFormat = "text" | "number" | "date";

const ADD_COL_FORMATS: { value: AddColumnFormat; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Văn bản", icon: Type },
  { value: "number", label: "Số", icon: Hash },
  { value: "date", label: "Ngày", icon: Calendar },
];

/** Per-column 3-dot menu: filter box + sort A→Z / Z→A + rename + add-column + clear. */
export function ColumnHeaderMenu({
  label,
  value,
  onFilter,
  onSort,
  onRename,
  onClear,
  onAddColumn,
  sortDir,
}: {
  label: string;
  value: string;
  onFilter: (v: string) => void;
  onSort: (dir: "asc" | "desc") => void;
  onRename: (label: string) => void;
  onClear: () => void;
  /** Thêm cột mới ngay bên phải cột này (VD: cột tùy chỉnh). */
  onAddColumn?: (opts: { label: string; type: AddColumnFormat }) => void;
  sortDir: "asc" | "desc" | null;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState(label);
  const [adding, setAdding] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<AddColumnFormat>("text");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setRenaming(false);
      setAdding(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const active = value.trim().length > 0 || sortDir !== null;
  const item =
    "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]";

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 222) });
          setOpen((o) => !o);
          setRenameText(label);
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-border-light)]",
          active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]",
        )}
        title={`Tùy chọn cột ${label}`}
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 w-[210px] rounded-[10px] border border-[var(--color-border)] bg-white p-1.5 shadow-lg normal-case tracking-normal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-1 pb-1.5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">Lọc dữ liệu</div>
            <input
              autoFocus
              value={value}
              onChange={(e) => onFilter(e.target.value)}
              placeholder="Nhập để lọc..."
              className="h-8 w-full rounded-[6px] border border-[var(--color-border)] px-2 text-[12.5px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          <button className={item} onClick={() => onSort("asc")}>
            <ArrowDownAZ size={14} className={cn(sortDir === "asc" && "text-[var(--color-accent)]")} /> Sắp xếp A → Z
          </button>
          <button className={item} onClick={() => onSort("desc")}>
            <ArrowUpAZ size={14} className={cn(sortDir === "desc" && "text-[var(--color-accent)]")} /> Sắp xếp Z → A
          </button>
          {renaming ? (
            <div className="flex items-center gap-1 px-1 py-1">
              <input
                autoFocus
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(renameText);
                    setRenaming(false);
                  }
                }}
                className="h-8 w-full rounded-[6px] border border-[var(--color-accent)] px-2 text-[12.5px] outline-none"
              />
              <button
                onClick={() => {
                  onRename(renameText);
                  setRenaming(false);
                }}
                className="rounded-[6px] bg-[var(--color-success)] px-2 py-1 text-[11px] font-medium text-white"
              >
                Lưu
              </button>
            </div>
          ) : (
            <button className={item} onClick={() => setRenaming(true)}>
              <Pencil size={14} /> Đổi tên cột
            </button>
          )}
          {onAddColumn && (
            <>
              <div className="my-1 h-px bg-[var(--color-border-light)]" />
              {adding ? (
                <div className="px-1 py-1">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColName.trim()) {
                        onAddColumn({ label: newColName.trim(), type: newColType });
                        setNewColName("");
                        setAdding(false);
                        setOpen(false);
                      }
                    }}
                    placeholder="Tên cột mới..."
                    className="h-8 w-full rounded-[6px] border border-[var(--color-accent)] px-2 text-[12.5px] outline-none"
                  />
                  <div className="mt-1.5 mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-text-lighter)]">Định dạng</div>
                  <div className="flex gap-1">
                    {ADD_COL_FORMATS.map((f) => {
                      const Icon = f.icon;
                      const on = newColType === f.value;
                      return (
                        <button
                          key={f.value}
                          onClick={() => setNewColType(f.value)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-0.5 rounded-[6px] border py-1.5 text-[10.5px]",
                            on
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]",
                          )}
                        >
                          <Icon size={14} /> {f.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => {
                        if (!newColName.trim()) return;
                        onAddColumn({ label: newColName.trim(), type: newColType });
                        setNewColName("");
                        setAdding(false);
                        setOpen(false);
                      }}
                      disabled={!newColName.trim()}
                      className="flex-1 rounded-[6px] bg-[var(--color-accent)] px-2 py-1.5 text-[11.5px] font-medium text-white disabled:opacity-50"
                    >
                      Thêm cột bên phải
                    </button>
                    <button
                      onClick={() => { setAdding(false); setNewColName(""); }}
                      className="rounded-[6px] border border-[var(--color-border)] px-2 py-1.5 text-[11.5px] text-[var(--color-text-secondary)]"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                <button className={item} onClick={() => { setAdding(true); setNewColName(""); setNewColType("text"); }}>
                  <Plus size={14} /> Thêm cột
                </button>
              )}
            </>
          )}
          <div className="my-1 h-px bg-[var(--color-border-light)]" />
          <button className={cn(item, !active && "opacity-50")} disabled={!active} onClick={onClear}>
            <X size={14} /> Xóa lọc & sắp xếp
          </button>
        </div>
      )}
    </div>
  );
}

export interface DataTableProps<Row> {
  tableKey: string;
  columns: ColumnDef<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string | number;
  onRowClick?: (row: Row) => void;
  rowClassName?: (row: Row, index: number) => string;
  /** Screen-specific controls rendered on the left of the toolbar. */
  toolbarLeft?: React.ReactNode;
  /** Extra controls (e.g. export) rendered on the right; receives current filtered rows + visible columns. */
  toolbarActions?: (ctx: { rows: Row[]; columns: ColumnDef<Row>[] }) => React.ReactNode;
  minWidth?: number;
  pageSize?: number;
  emptyText?: string;
  defaultColWidth?: (c: ColumnDef<Row>) => number;
  /** Cho phép thêm cột mới ngay bên phải một cột (chèn cột tùy chỉnh). */
  onAddColumn?: (afterColumnId: string, opts: { label: string; type: AddColumnFormat }) => void;
  /** Cột nào được phép xoá (VD: cột tùy chỉnh) — hiện nút xoá trong menu "Cột". */
  isColumnDeletable?: (c: ColumnDef<Row>) => boolean;
  /** Xoá cột (thường là cột tùy chỉnh). */
  onDeleteColumn?: (id: string) => void;
}

export function DataTable<Row>({
  tableKey,
  columns,
  rows,
  getRowKey,
  onRowClick,
  rowClassName,
  toolbarLeft,
  toolbarActions,
  minWidth = 900,
  pageSize,
  emptyText = "Không có dữ liệu.",
  defaultColWidth,
  onAddColumn,
  isColumnDeletable,
  onDeleteColumn,
}: DataTableProps<Row>) {
  const {
    hidden,
    toggle,
    reset,
    visibleColumns,
    reorderLocked,
    toggleReorderLock,
    moveColumn,
    placeColumnAfter,
    renameColumn,
    widths,
    setColumnWidth,
  } = useColumnPrefs(tableKey, columns);

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<{ colId: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLTableElement>(null);

  // Khi thêm cột mới: nhớ "chèn sau cột nào", rồi khi cột mới xuất hiện trong
  // `columns` (screen tạo xong custom field) thì đặt nó ngay bên phải cột đó.
  const pendingAfterRef = useRef<string | null>(null);
  const knownColIdsRef = useRef<Set<string>>(new Set(columns.map((c) => c.id)));
  useEffect(() => {
    const ids = columns.map((c) => c.id);
    if (pendingAfterRef.current) {
      const newId = ids.find((id) => !knownColIdsRef.current.has(id));
      if (newId) {
        placeColumnAfter(newId, pendingAfterRef.current);
        pendingAfterRef.current = null;
      }
    }
    knownColIdsRef.current = new Set(ids);
  }, [columns, placeColumnAfter]);

  const filterKey = JSON.stringify(colFilters) + JSON.stringify(sortState);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset page on filter/sort change
    setPage(1);
  }, [filterKey]);

  const filtered = useMemo(() => {
    let list = rows;
    for (const [colId, text] of Object.entries(colFilters)) {
      if (!text.trim()) continue;
      const col = columns.find((c) => c.id === colId);
      if (!col?.exportValue) continue;
      const q = text.toLowerCase();
      list = list.filter((r, i) => String(col.exportValue!(r, i)).toLowerCase().includes(q));
    }
    if (sortState) {
      const col = columns.find((c) => c.id === sortState.colId);
      if (col?.exportValue) {
        const dir = sortState.dir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
          const va = col.exportValue!(a, 0);
          const vb = col.exportValue!(b, 0);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb), "vi") * dir;
        });
      }
    }
    return list;
  }, [rows, colFilters, sortState, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const pageRows = pageSize ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  function colWidth(c: ColumnDef<Row>): number {
    if (widths[c.id]) return widths[c.id];
    return defaultColWidth?.(c) ?? 150;
  }

  function startResize(colId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLElement | null;
    const startX = e.clientX;
    const startW = th ? th.getBoundingClientRect().width : widths[colId] ?? 150;
    const onMove = (ev: MouseEvent) => setColumnWidth(colId, Math.max(60, Math.min(600, startW + (ev.clientX - startX))));
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function autoFitColumn(colId: string) {
    const root = tableRef.current;
    if (!root) return;
    let max = 0;
    root.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(colId)}"]`).forEach((el) => {
      const inner = el.firstElementChild as HTMLElement | null;
      max = Math.max(max, inner ? inner.scrollWidth : el.scrollWidth);
    });
    if (max > 0) setColumnWidth(colId, Math.max(60, Math.min(600, max + 28)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolbarLeft}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ColumnMenu columns={columns} hidden={hidden} onToggle={toggle} onReset={reset} isDeletable={isColumnDeletable} onDeleteColumn={onDeleteColumn} />
          <button
            onClick={toggleReorderLock}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12.5px] transition-colors",
              reorderLocked
                ? "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                : "border-[var(--color-accent)] bg-[var(--color-accent)] text-white",
            )}
            title={
              reorderLocked
                ? "Mở khoá để kéo đổi vị trí và chỉnh rộng cột"
                : "Đang mở khoá — kéo grip để đổi vị trí, kéo vạch phải để chỉnh rộng, nháy đúp vạch để tự canh. Bấm để khoá & lưu lại"
            }
          >
            {reorderLocked ? <Lock size={14} /> : <Unlock size={14} />}
            {reorderLocked ? "Khoá cột" : "Đang chỉnh cột · Lưu"}
          </button>
          {toolbarActions?.({ rows: filtered, columns: visibleColumns })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table ref={tableRef} className="w-full table-fixed text-[13px]" style={{ minWidth }}>
          <colgroup>
            <col style={{ width: 52 }} />
            {visibleColumns.map((c) => (
              <col key={c.id} style={{ width: colWidth(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-4 py-3 text-center font-medium">STT</th>
              {visibleColumns.map((c) => {
                const canDrag = !reorderLocked && !c.noReorder;
                const canMenu = !!c.exportValue && !c.noReorder;
                const canResize = !reorderLocked && !c.noReorder;
                return (
                  <th
                    key={c.id}
                    data-col={c.id}
                    onDragOver={(e) => {
                      if (!reorderLocked && !c.noReorder) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (reorderLocked || c.noReorder) return;
                      e.preventDefault();
                      const dragId = e.dataTransfer.getData("text/plain");
                      if (dragId) moveColumn(dragId, c.id);
                    }}
                    className={cn(
                      "relative border-l border-[var(--color-border-light)] px-3 py-3 font-medium",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    <span
                      className={cn(
                        "flex min-w-0 items-center gap-1",
                        c.align === "right" && "justify-end",
                        c.align === "center" && "justify-center",
                      )}
                    >
                      {canDrag && (
                        <span
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                          className="flex-shrink-0 cursor-grab text-[var(--color-text-lighter)] hover:text-[var(--color-accent)] active:cursor-grabbing"
                          title="Kéo để đổi vị trí cột"
                        >
                          <GripVertical size={13} />
                        </span>
                      )}
                      <span className="truncate">{c.label}</span>
                      {canMenu && (
                        <span className="flex-shrink-0">
                          <ColumnHeaderMenu
                            label={c.label}
                            value={colFilters[c.id] ?? ""}
                            sortDir={sortState?.colId === c.id ? sortState.dir : null}
                            onFilter={(v) => setColFilters((s) => ({ ...s, [c.id]: v }))}
                            onSort={(dir) => setSortState({ colId: c.id, dir })}
                            onRename={(label) => renameColumn(c.id, label)}
                            onClear={() => {
                              setColFilters((s) => ({ ...s, [c.id]: "" }));
                              setSortState((s) => (s?.colId === c.id ? null : s));
                            }}
                            onAddColumn={
                              onAddColumn
                                ? (opts) => {
                                    pendingAfterRef.current = c.id;
                                    onAddColumn(c.id, opts);
                                  }
                                : undefined
                            }
                          />
                        </span>
                      )}
                    </span>
                    {canResize && (
                      <span
                        onMouseDown={(e) => startResize(c.id, e)}
                        onDoubleClick={() => autoFitColumn(c.id)}
                        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-[var(--color-accent)]/40"
                        title="Kéo để chỉnh rộng cột · Nháy đúp để tự canh theo nội dung"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const stt = pageSize ? (page - 1) * pageSize + i + 1 : i + 1;
              return (
                <tr
                  key={getRowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-t border-[var(--color-border-light)]",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-page-bg)]",
                    rowClassName?.(row, i),
                  )}
                >
                  <td className="px-4 py-2.5 text-center font-[family-name:var(--font-mono)] text-[var(--color-text-lighter)]">
                    {stt}
                  </td>
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      data-col={c.id}
                      className={cn(
                        "overflow-hidden border-l border-[var(--color-border-light)] px-3 py-2.5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.cellClass,
                      )}
                    >
                      <div className={cn("min-w-0 truncate", c.align === "center" && "mx-auto")}>{c.cell(row, i)}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize && (
        <div className="flex items-center justify-between text-[12.5px] text-[var(--color-text-muted)]">
          <div>Hiển thị {pageRows.length} / {filtered.length}</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "h-8 w-8 rounded-[8px] text-[12.5px]",
                  p === page ? "bg-[var(--color-accent)] text-white" : "border border-[var(--color-border)]",
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
