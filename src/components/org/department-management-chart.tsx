"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, ChevronRight, LocateFixed, Pencil, Phone } from "lucide-react";
import {
  ChartConnectorLayer,
  useChartConnectors,
  type ConnectorEdge,
} from "@/components/org/chart-connector-layer";
import { EmployeeGroupPanel } from "@/components/org/employee-group-panel";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";
import type {
  CompactDepartmentTreeResult,
  CompactOrgNode,
  OrgPerson,
} from "@/lib/org-hierarchy";

const nodeId = (person: OrgPerson) => `department-manager-${person.id}`;

export interface DepartmentManagementChartProps {
  tree: CompactDepartmentTreeResult;
  onSelectEmployee: (person: OrgPerson) => void;
  onEditEmployee?: (person: OrgPerson) => void;
}

function collectCollapsibleIds(nodes: CompactOrgNode[]): Set<number> {
  const result = new Set<number>();
  const visit = (node: CompactOrgNode) => {
    if (node.children.length > 0) result.add(node.person.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

function visibleEdges(nodes: CompactOrgNode[], collapsed: Set<number>): ConnectorEdge[] {
  const edges: ConnectorEdge[] = [];
  const visit = (node: CompactOrgNode) => {
    if (collapsed.has(node.person.id)) return;
    for (const child of node.children) {
      edges.push({ from: nodeId(node.person), to: nodeId(child.person) });
      visit(child);
    }
  };
  nodes.forEach(visit);
  return edges;
}

function findNode(nodes: CompactOrgNode[], personId: number): CompactOrgNode | null {
  for (const node of nodes) {
    if (node.person.id === personId) return node;
    const descendant = findNode(node.children, personId);
    if (descendant) return descendant;
  }
  return null;
}

function ManagementNode({
  node,
  collapsed,
  registerNode,
  onToggle,
  onSelect,
  onEdit,
  onOpenEmployees,
}: {
  node: CompactOrgNode;
  collapsed: Set<number>;
  registerNode: ReturnType<typeof useChartConnectors>["registerNode"];
  onToggle: (id: number) => void;
  onSelect: (person: OrgPerson) => void;
  onEdit?: (person: OrgPerson) => void;
  onOpenEmployees: (managerId: number) => void;
}) {
  const isCollapsed = collapsed.has(node.person.id);
  const photo = node.person.photoUrl ?? getEmployeePhoto(node.person.id);

  return (
    <li className="relative flex shrink-0 flex-col items-center px-3 pt-5">
      <div
        ref={registerNode(nodeId(node.person))}
        className="group relative z-10 w-[190px] rounded-[12px] border border-[var(--color-border)] bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() => onSelect(node.person)}
          aria-label={`Xem hồ sơ ${node.person.name}, ${node.person.position ?? "Quản lý"}`}
          className="flex w-full items-center gap-2.5 rounded-[12px] p-3 text-left transition hover:bg-[var(--color-page-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : getInitials(node.person.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
              {node.person.name}
            </span>
            <span className="block truncate text-[11px] text-[var(--color-text-light)]">
              {node.person.position ?? "Quản lý"}
            </span>
            {node.person.phone && (
              <span className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-[var(--color-accent)]">
                <Phone size={10} aria-hidden="true" />
                <span>{node.person.phone}</span>
              </span>
            )}
          </span>
        </button>

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(node.person)}
            aria-label={`Chỉnh sửa ${node.person.name}`}
            className="absolute -right-2 -top-2 rounded-full border border-[var(--color-border)] bg-white p-1.5 text-[var(--color-accent)] opacity-0 shadow-sm transition hover:bg-[var(--color-page-bg)] focus:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] group-hover:opacity-100"
          >
            <Pencil size={12} aria-hidden="true" />
          </button>
        )}

        {node.children.length > 0 && (
          <button
            type="button"
            onClick={() => onToggle(node.person.id)}
            aria-label={`${isCollapsed ? "Mở rộng" : "Thu gọn"} nhánh của ${node.person.name}`}
            aria-expanded={!isCollapsed}
            className="absolute -bottom-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-light)] shadow-sm hover:text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {node.employees.length > 0 && (
        <button
          type="button"
          onClick={() => onOpenEmployees(node.person.id)}
          aria-label={`Xem ${node.employees.length} nhân viên do ${node.person.name} quản lý`}
          className="relative z-10 mt-5 rounded-[8px] border border-dashed border-[var(--color-accent)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-page-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          {node.employees.length} nhân viên
        </button>
      )}

      {!isCollapsed && node.children.length > 0 && (
        <ul className="relative mt-8 flex min-w-max items-start justify-center">
          {node.children.map((child) => (
            <ManagementNode
              key={child.person.id}
              node={child}
              collapsed={collapsed}
              registerNode={registerNode}
              onToggle={onToggle}
              onSelect={onSelect}
              onEdit={onEdit}
              onOpenEmployees={onOpenEmployees}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DepartmentManagementChart({
  tree,
  onSelectEmployee,
  onEditEmployee,
}: DepartmentManagementChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [employeeGroupManagerId, setEmployeeGroupManagerId] = useState<number | null>(null);
  const allRoots = useMemo(
    () => [
      ...(tree.root ? [tree.root] : []),
      ...tree.additionalRoots,
      ...tree.unassigned,
    ],
    [tree],
  );
  const edges = useMemo(() => visibleEdges(allRoots, collapsed), [allRoots, collapsed]);
  const collapsibleIds = useMemo(() => collectCollapsibleIds(allRoots), [allRoots]);
  const employeeGroup = useMemo(
    () => employeeGroupManagerId === null
      ? null
      : findNode(allRoots, employeeGroupManagerId),
    [allRoots, employeeGroupManagerId],
  );
  const { containerRef, registerNode, paths, measure } = useChartConnectors(edges);

  useEffect(() => {
    if (employeeGroupManagerId === null || employeeGroup !== null) return;
    const timer = setTimeout(() => setEmployeeGroupManagerId(null), 0);
    return () => clearTimeout(timer);
  }, [employeeGroup, employeeGroupManagerId]);

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== null) {
      clearTimeout(suppressClickTimerRef.current);
    }
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [employeeGroup, measure]);

  const toggle = useCallback((id: number) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const recenter = () => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "center" });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target instanceof Element
      && event.target.closest("button, input, select, textarea, a")) return;
    const canvas = scrollRef.current;
    if (!canvas) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: canvas.scrollLeft,
      top: canvas.scrollTop,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = scrollRef.current;
    if (!drag || !canvas || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) {
      event.preventDefault();
      canvas.scrollLeft = drag.left - dx;
      canvas.scrollTop = drag.top - dy;
    }
  };

  const releaseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = scrollRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return null;
    dragRef.current = null;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return drag;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = releaseDrag(event);
    if (!drag?.moved) return;
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current !== null) {
      clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 0);
  };

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = releaseDrag(event);
    if (!drag) return;
    suppressClickRef.current = false;
    if (suppressClickTimerRef.current !== null) {
      clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
  };

  const warningRoots = [...tree.additionalRoots, ...tree.unassigned];
  const isEmpty = allRoots.length === 0;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={recenter} className="flex items-center gap-1.5 rounded-[7px] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-[11px]">
          <LocateFixed size={13} aria-hidden="true" /> Về trung tâm
        </button>
        <button type="button" onClick={() => setCollapsed(new Set(collapsibleIds))} className="rounded-[7px] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-[11px]">
          Thu gọn tất cả
        </button>
        <button type="button" onClick={() => setCollapsed(new Set())} className="rounded-[7px] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-[11px]">
          Mở rộng tất cả
        </button>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
          if (suppressClickTimerRef.current !== null) {
            clearTimeout(suppressClickTimerRef.current);
            suppressClickTimerRef.current = null;
          }
        }}
        className="min-h-[420px] max-h-[72vh] touch-none cursor-grab overflow-scroll rounded-[10px] bg-[var(--color-page-bg)] active:cursor-grabbing"
      >
        <div
          ref={containerRef}
          className="relative isolate min-h-[420px] min-w-[720px] w-max px-8 py-6"
        >
          <ChartConnectorLayer paths={paths} />

          {tree.root ? (
            <div ref={rootRef} className="relative z-10 flex justify-center">
              <ul className="flex min-w-max justify-center">
                <ManagementNode
                  node={tree.root}
                  collapsed={collapsed}
                  registerNode={registerNode}
                  onToggle={toggle}
                  onSelect={onSelectEmployee}
                  onEdit={onEditEmployee}
                  onOpenEmployees={setEmployeeGroupManagerId}
                />
              </ul>
            </div>
          ) : isEmpty ? (
            <div ref={rootRef} className="relative z-10 mx-auto w-fit rounded-[10px] border border-dashed border-[var(--color-border)] bg-white px-5 py-4 text-[13px] font-medium text-[var(--color-text-muted)]">
              Chưa có nhân sự trong phòng ban
            </div>
          ) : (
            <div ref={rootRef} className="relative z-10 mx-auto w-fit rounded-[10px] border border-dashed border-[var(--color-warning)] bg-white px-5 py-4 text-[13px] font-medium text-[var(--color-warning)]">
              Chưa xác định Trưởng phòng
            </div>
          )}

          {warningRoots.length > 0 && (
            <section
              aria-label="Các nhánh chưa xác định quản lý"
              className="relative z-10 mt-10 min-w-full rounded-[12px] border border-dashed border-[var(--color-warning)] px-5 pb-5 pt-3"
            >
              <h3 className="text-center text-[11px] font-medium uppercase tracking-wide text-[var(--color-warning)]">
                Chưa xác định quản lý
              </h3>
              <ul className="mt-2 flex min-w-max items-start justify-center">
                {warningRoots.map((node) => (
                  <ManagementNode
                    key={node.person.id}
                    node={node}
                    collapsed={collapsed}
                    registerNode={registerNode}
                    onToggle={toggle}
                    onSelect={onSelectEmployee}
                    onEdit={onEditEmployee}
                    onOpenEmployees={setEmployeeGroupManagerId}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {employeeGroup && (
        <EmployeeGroupPanel
          manager={employeeGroup.person}
          employees={employeeGroup.employees}
          onClose={() => setEmployeeGroupManagerId(null)}
          onSelectEmployee={(person) => {
            setEmployeeGroupManagerId(null);
            onSelectEmployee(person);
          }}
        />
      )}
    </div>
  );
}
