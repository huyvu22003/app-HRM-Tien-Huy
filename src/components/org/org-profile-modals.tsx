"use client";

import { useEffect } from "react";
import { Mail, Phone, X } from "lucide-react";
import type { ApiDepartment, ApiEmployee } from "@/lib/api";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-[15px] font-semibold">{title}</h3><button aria-label="Đóng" onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function EmployeeQuickProfileModal({ employee, onClose, onViewFullProfile }: { employee: ApiEmployee; onClose: () => void; onViewFullProfile: (id: number) => void }) {
  const photo = getEmployeePhoto(employee.id);
  return (
    <DialogFrame title={`Hồ sơ ${employee.name}`} onClose={onClose}>
      <div className="flex gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] font-semibold text-white">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : getInitials(employee.name)}
        </div>
        <div><div className="text-[18px] font-semibold">{employee.name}</div><div className="text-[12px] text-[var(--color-text-light)]">{employee.code} · {employee.position ?? "Nhân viên"}</div><div className="mt-1 text-[12px]">{employee.department_name ?? "-"}</div></div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-[12.5px]"><Phone size={14} /> {employee.phone ?? "-"}</div>
        <div className="flex items-center gap-2 text-[12.5px]"><Mail size={14} /> {employee.email ?? "-"}</div>
        <div className="text-[12.5px]"><span className="text-[var(--color-text-light)]">Quản lý:</span> {employee.manager_name ?? employee.manager ?? "-"}</div>
        <div className="text-[12.5px]"><span className="text-[var(--color-text-light)]">Trạng thái:</span> {employee.status}</div>
      </div>
      <div className="mt-5 flex justify-end"><button onClick={() => onViewFullProfile(employee.id)} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[12.5px] font-medium text-white">Xem hồ sơ đầy đủ</button></div>
    </DialogFrame>
  );
}

export function DepartmentInfoModal({ department, employees, head, onClose, onViewDepartment }: { department: ApiDepartment; employees: ApiEmployee[]; head?: ApiEmployee; onClose: () => void; onViewDepartment: (id: number) => void }) {
  return (
    <DialogFrame title={department.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 text-[12.5px]"><div><span className="text-[var(--color-text-light)]">Khối:</span><br />{department.block}</div><div><span className="text-[var(--color-text-light)]">Quản lý:</span><br />{head?.name ?? "Chưa xác định"}</div><div><span className="text-[var(--color-text-light)]">Nhân sự:</span><br />{employees.length}</div></div>
      <div className="mt-4 border-t border-[var(--color-border-light)] pt-3"><div className="mb-2 text-[11px] font-medium uppercase text-[var(--color-text-light)]">Danh sách nhân viên</div>{employees.map((employee) => <div key={employee.id} className="py-1.5 text-[12.5px]">{employee.name} · {employee.position ?? "Nhân viên"}</div>)}</div>
      <div className="mt-5 flex justify-end"><button onClick={() => onViewDepartment(department.id)} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[12.5px] font-medium text-white">Xem sơ đồ phòng ban</button></div>
    </DialogFrame>
  );
}
