"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Users, Loader2, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import {
  fetchDepartments,
  fetchEmployees,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type ApiEmployee,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { BLOCKS } from "@/lib/data/departments";
import { getInitials, cn } from "@/lib/utils";

interface DeptEntry {
  dept: string;
  deptId: number;
  staff: ApiEmployee[];
}

interface BlockEntry {
  block: string;
  departments: DeptEntry[];
}

type DeptForm = { id: number | null; name: string; block: string };

function DeptFormModal({
  initial,
  saving,
  onSave,
  onClose,
}: {
  initial: DeptForm;
  saving: boolean;
  onSave: (f: DeptForm) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [block, setBlock] = useState(initial.block || BLOCKS[0].name);
  const isEdit = initial.id !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[420px] rounded-[14px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            {isEdit ? "Sửa phòng ban" : "Thêm phòng ban"}
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">Tên phòng ban</div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phay CNC"
              className="h-9 w-full rounded-[8px] border border-[var(--color-border)] px-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">Khối</div>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-[var(--color-border)] bg-white px-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
            >
              {BLOCKS.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]"
          >
            Huỷ
          </button>
          <button
            onClick={() => onSave({ id: initial.id, name: name.trim(), block })}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-success)] px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrgScreen({ onNavigate }: { onNavigate: (screen: string, id?: string) => void }) {
  const { role } = useAuth();
  const canEdit = role === "super" || role === "hr";

  const deptFetcher = useCallback(() => fetchDepartments(), []);
  const empFetcher = useCallback(() => fetchEmployees({ pageSize: 200 }), []);

  const { data: deptData, isLoading: deptLoading, refetch: refetchDepts } = useQuery(deptFetcher);
  const { data: empData, isLoading: empLoading } = useQuery(empFetcher);

  const isLoading = deptLoading || empLoading;

  const createMut = useMutation((f: DeptForm) => createDepartment({ name: f.name, block: f.block }));
  const updateMut = useMutation((f: DeptForm) => updateDepartment(f.id!, { name: f.name, block: f.block }));
  const deleteMut = useMutation((id: number) => deleteDepartment(id));

  const [modal, setModal] = useState<DeptForm | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const structure = useMemo<BlockEntry[]>(() => {
    if (!deptData?.data) return [];
    const allEmployees = empData?.data ?? [];

    const blockMap = new Map<string, DeptEntry[]>();
    for (const d of deptData.data) {
      const blockName = d.block || "Khác";
      if (!blockMap.has(blockName)) blockMap.set(blockName, []);
      blockMap.get(blockName)!.push({
        dept: d.name,
        deptId: d.id,
        staff: allEmployees.filter((e: ApiEmployee) => e.department_name === d.name),
      });
    }

    return Array.from(blockMap.entries()).map(([block, departments]) => ({
      block,
      departments,
    }));
  }, [deptData, empData]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeDept, setActiveDept] = useState<{ block: string; dept: string; staff: ApiEmployee[] } | null>(null);

  const firstDept = structure[0]?.departments[0];
  const selected = activeDept ?? (firstDept ? { block: structure[0].block, dept: firstDept.dept, staff: firstDept.staff } : null);

  async function handleSaveDept(f: DeptForm) {
    setActionError(null);
    try {
      if (f.id === null) {
        await createMut.mutate(f);
      } else {
        await updateMut.mutate(f);
      }
      setModal(null);
      refetchDepts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Lưu phòng ban thất bại");
    }
  }

  async function handleDeleteDept(deptId: number, deptName: string, staffCount: number) {
    if (staffCount > 0) {
      setActionError(`Không thể xóa "${deptName}": vẫn còn ${staffCount} nhân sự. Chuyển họ sang phòng ban khác trước.`);
      return;
    }
    if (!window.confirm(`Xóa phòng ban "${deptName}"?`)) return;
    setActionError(null);
    try {
      await deleteMut.mutate(deptId);
      if (selected?.dept === deptName) setActiveDept(null);
      refetchDepts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Xóa phòng ban thất bại");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="ml-2 text-[13px]">Đang tải cơ cấu tổ chức...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {modal && (
        <DeptFormModal
          initial={modal}
          saving={createMut.isLoading || updateMut.isLoading}
          onSave={handleSaveDept}
          onClose={() => setModal(null)}
        />
      )}

      {canEdit && (
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-[var(--color-text-muted)]">
            Quản lý phòng ban — thêm, sửa, xóa trực tiếp trên sơ đồ.
          </div>
          <button
            onClick={() => setModal({ id: null, name: "", block: BLOCKS[0].name })}
            className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={14} /> Thêm phòng ban
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-2.5 text-[12.5px] text-[var(--color-warning)]">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
          <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Cơ cấu tổ chức</div>
          <div className="flex flex-col gap-1">
            {structure.map((b) => {
              const isOpen = expanded[b.block] ?? true;
              const total = b.departments.reduce((sum, d) => sum + d.staff.length, 0);
              return (
                <div key={b.block}>
                  <button
                    onClick={() => setExpanded((s) => ({ ...s, [b.block]: !isOpen }))}
                    className="flex w-full items-center justify-between rounded-[8px] px-2 py-2 text-left hover:bg-[var(--color-page-bg)]"
                  >
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-primary)]">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {b.block}
                    </div>
                    <span className="text-[11px] text-[var(--color-text-light)]">{total}</span>
                  </button>
                  {isOpen && (
                    <div className="ml-4 flex flex-col gap-0.5 border-l border-[var(--color-border-light)] pl-2">
                      {b.departments.map((d) => (
                        <div
                          key={d.dept}
                          className={cn(
                            "group flex items-center justify-between rounded-[8px] px-2 py-1.5 text-[12.5px]",
                            selected?.dept === d.dept
                              ? "bg-[var(--color-accent)] text-white"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                          )}
                        >
                          <button
                            onClick={() => setActiveDept({ block: b.block, dept: d.dept, staff: d.staff })}
                            className="flex min-w-0 flex-1 items-center justify-between text-left"
                          >
                            <span className="truncate">{d.dept}</span>
                            <span className="ml-1 text-[11px] opacity-80">{d.staff.length}</span>
                          </button>
                          {canEdit && (
                            <div className="ml-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => setModal({ id: d.deptId, name: d.dept, block: b.block })}
                                title="Sửa"
                                className={cn(
                                  "rounded p-0.5",
                                  selected?.dept === d.dept ? "hover:bg-white/20" : "hover:bg-[var(--color-border-light)]"
                                )}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteDept(d.deptId, d.dept, d.staff.length)}
                                title="Xóa"
                                className={cn(
                                  "rounded p-0.5",
                                  selected?.dept === d.dept ? "hover:bg-white/20" : "hover:bg-[var(--color-border-light)] hover:text-[var(--color-danger)]"
                                )}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          {selected ? (
            <>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                  <Users size={17} className="text-[var(--color-accent)]" />
                  {selected.dept}
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      const entry = structure
                        .flatMap((b) => b.departments.map((d) => ({ ...d, block: b.block })))
                        .find((d) => d.dept === selected.dept);
                      if (entry) setModal({ id: entry.deptId, name: entry.dept, block: entry.block });
                    }}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                  >
                    <Pencil size={12} /> Sửa phòng ban
                  </button>
                )}
              </div>
              <div className="mb-4 text-[12.5px] text-[var(--color-text-light)]">
                {selected.block} · {selected.staff.length} nhân sự
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {selected.staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onNavigate("employee-detail", String(s.id))}
                    className="flex items-center gap-2.5 rounded-[10px] border border-[var(--color-border-light)] p-2.5 text-left hover:border-[var(--color-accent)]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-white">
                      {getInitials(s.name ?? "?")}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                        {s.name}
                      </div>
                      <div className="truncate text-[11px] text-[var(--color-text-light)]">
                        {s.position ?? "Nhân viên"}
                      </div>
                    </div>
                  </button>
                ))}
                {selected.staff.length === 0 && (
                  <div className="col-span-full py-8 text-center text-[12.5px] text-[var(--color-text-muted)]">
                    Chưa có nhân sự trong phòng ban này.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-[var(--color-text-muted)]">Chọn một bộ phận để xem chi tiết.</div>
          )}
        </div>
      </div>
    </div>
  );
}
