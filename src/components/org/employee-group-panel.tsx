"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, Search, X } from "lucide-react";
import { normalizePersonName, type OrgPerson } from "@/lib/org-hierarchy";
import { getEmployeePhoto } from "@/lib/photo-store";
import { getInitials } from "@/lib/utils";

function normalizeSearchValue(value: string): string {
  return normalizePersonName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function EmployeeGroupPanel({
  manager,
  employees,
  onClose,
  onSelectEmployee,
}: {
  manager: OrgPerson;
  employees: OrgPerson[];
  onClose: () => void;
  onSelectEmployee: (employee: OrgPerson) => void;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = normalizeSearchValue(search);
  const filteredEmployees = useMemo(() => {
    if (!normalizedSearch) return employees;

    return employees.filter((employee) => {
      const searchableValue = [
        employee.name,
        String(employee.id),
        employee.position ?? "",
        employee.phone ?? "",
      ].join(" ");
      return normalizeSearchValue(searchableValue).includes(normalizedSearch);
    });
  }, [employees, normalizedSearch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 sm:absolute"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-group-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="fixed inset-y-0 right-0 flex w-full max-w-[360px] flex-col bg-white shadow-xl sm:absolute"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border-light)] px-4 py-4">
          <div className="min-w-0">
            <h2 id="employee-group-title" className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              Nhân viên ({employees.length})
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-light)]">
              Quản lý: {manager.name}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng danh sách nhân viên"
            onClick={onClose}
            className="rounded-[7px] p-1.5 text-[var(--color-text-light)] transition hover:bg-[var(--color-page-bg)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b border-[var(--color-border-light)] p-4">
          <label htmlFor="employee-group-search" className="sr-only">
            Tìm kiếm nhân viên
          </label>
          <div className="flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 focus-within:border-[var(--color-accent)]">
            <Search size={15} className="shrink-0 text-[var(--color-text-light)]" aria-hidden="true" />
            <input
              id="employee-group-search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên, mã, vị trí hoặc điện thoại"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[12.5px] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredEmployees.length > 0 ? (
            <ul>
              {filteredEmployees.map((employee) => {
                const photo = getEmployeePhoto(employee.id);
                return (
                  <li key={employee.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEmployee(employee)}
                      className="flex w-full items-center gap-3 rounded-[9px] p-2.5 text-left transition hover:bg-[var(--color-page-bg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-accent)]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        ) : getInitials(employee.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                          {employee.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--color-text-light)]">
                          {employee.position ?? "Nhân viên"}
                        </span>
                        {employee.phone && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[var(--color-text-muted)]">
                            <Phone size={11} aria-hidden="true" />
                            {employee.phone}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-12 text-center text-[12.5px] text-[var(--color-text-muted)]">
              Không tìm thấy nhân viên phù hợp.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
