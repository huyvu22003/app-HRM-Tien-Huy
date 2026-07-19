"use client";

import { useState } from "react";
import { Minus, Plus, Maximize2, Pencil } from "lucide-react";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";
import { isManagementRole, type OrgNode, type OrgPerson } from "@/lib/org-hierarchy";

function TreeNode({
  node,
  onSelect,
  onEdit,
  showPhone,
}: {
  node: OrgNode;
  onSelect: (person: OrgPerson) => void;
  onEdit?: (person: OrgPerson) => void;
  showPhone?: boolean;
}) {
  const photo = getEmployeePhoto(node.person.id);
  return (
    <li className="relative flex flex-col items-center px-2 pt-5">
      <div className="group relative">
        <button
          onClick={() => onSelect(node.person)}
          aria-label={`${node.person.name}, ${node.person.position ?? "Nhân viên"}`}
          className="flex w-[190px] items-center gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-white p-3 text-left shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : getInitials(node.person.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">{node.person.name}</span>
            <span className="block truncate text-[11px] text-[var(--color-text-light)]">{node.person.position ?? "Nhân viên"}</span>
            {showPhone && isManagementRole(node.person) && node.person.phone && (
              <span className="mt-0.5 block text-[10.5px] text-[var(--color-accent)]">{node.person.phone}</span>
            )}
          </span>
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(node.person)}
            aria-label={`Sửa nhánh của ${node.person.name}`}
            className="absolute -right-2 -top-2 rounded-full border border-[var(--color-border)] bg-white p-1.5 text-[var(--color-accent)] opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="relative mt-5 flex items-start justify-center border-t border-[var(--color-border)] pt-0 before:absolute before:-top-5 before:left-1/2 before:h-5 before:border-l before:border-[var(--color-border)]">
          {node.children.map((child) => (
            <TreeNode key={child.person.id} node={child} onSelect={onSelect} onEdit={onEdit} showPhone={showPhone} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartCanvas({
  roots,
  unassigned,
  onSelectEmployee,
  onEditEmployee,
  showManagementPhones,
}: {
  roots: OrgNode[];
  unassigned: OrgNode[];
  onSelectEmployee: (person: OrgPerson) => void;
  onEditEmployee?: (person: OrgPerson) => void;
  showManagementPhones?: boolean;
}) {
  const [scale, setScale] = useState(1);
  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-end gap-1.5">
        <button aria-label="Thu nhỏ" onClick={() => setScale((value) => Math.max(0.6, +(value - 0.1).toFixed(1)))} className="rounded-[7px] border border-[var(--color-border)] p-1.5"><Minus size={14} /></button>
        <button aria-label="Phóng to" onClick={() => setScale((value) => Math.min(1.4, +(value + 0.1).toFixed(1)))} className="rounded-[7px] border border-[var(--color-border)] p-1.5"><Plus size={14} /></button>
        <button aria-label="Vừa màn hình" onClick={() => setScale(1)} className="flex items-center gap-1 rounded-[7px] border border-[var(--color-border)] px-2 py-1 text-[11px]"><Maximize2 size={13} /> Vừa màn hình</button>
      </div>
      <div className="min-h-[360px] overflow-x-auto rounded-[10px] bg-[var(--color-page-bg)] p-4">
        {roots.length ? (
          <div data-testid="org-chart-stage" data-scale={scale} style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: `${100 / scale}%` }}>
            <ul className="flex min-w-max items-start justify-center">
              {roots.map((root) => <TreeNode key={root.person.id} node={root} onSelect={onSelectEmployee} onEdit={onEditEmployee} showPhone={showManagementPhones} />)}
            </ul>
            {unassigned.length > 0 && (
              <div className="mt-8 border-t border-dashed border-[var(--color-border)] pt-4">
                <div className="mb-2 text-center text-[11px] font-medium uppercase text-[var(--color-warning)]">Chưa xác định quản lý</div>
                <ul className="flex min-w-max items-start justify-center">
                  {unassigned.map((root) => <TreeNode key={root.person.id} node={root} onSelect={onSelectEmployee} onEdit={onEditEmployee} />)}
                </ul>
              </div>
            )}
          </div>
        ) : <div className="py-20 text-center text-[12.5px] text-[var(--color-text-muted)]">Chưa có dữ liệu để dựng sơ đồ.</div>}
      </div>
    </div>
  );
}
