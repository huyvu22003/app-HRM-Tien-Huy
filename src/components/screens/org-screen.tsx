"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Users, Loader2, Plus, Pencil, Trash2, X, Save, Network } from "lucide-react";
import {
  fetchDepartments,
  fetchEmployees,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateHierarchy,
  type ApiEmployee,
  type ApiDepartment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { BLOCKS } from "@/lib/data/departments";
import { cn } from "@/lib/utils";
import {
  apiEmployeeToOrgPerson,
  buildCompactDepartmentHierarchy,
  filterInsertManagerCandidates,
  filterManagerCandidates,
  isManagementRole,
  selectDepartmentHeadId,
  type OrgPerson,
} from "@/lib/org-hierarchy";
import { CompanyDepartmentChart } from "@/components/org/company-department-chart";
import { DepartmentManagementChart } from "@/components/org/department-management-chart";
import { DepartmentInfoModal, EmployeeQuickProfileModal } from "@/components/org/org-profile-modals";

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

  const { data: deptData, isLoading: deptLoading, error: deptError, refetch: refetchDepts } = useQuery(deptFetcher);
  const { data: empData, isLoading: empLoading, error: empError, refetch: refetchEmployees } = useQuery(empFetcher);

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
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployee | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<ApiDepartment | null>(null);
  const [editingPerson, setEditingPerson] = useState<OrgPerson | null>(null);
  const [editAction, setEditAction] = useState<"move" | "insert" | "remove-level">("move");
  const [candidateId, setCandidateId] = useState("");
  const [savingHierarchy, setSavingHierarchy] = useState(false);

  const people = useMemo(() => (empData?.data ?? []).map(apiEmployeeToOrgPerson), [empData]);
  const departments = useMemo(() => deptData?.data ?? [], [deptData]);
  const activeDepartment = activeDeptId === null
    ? null
    : departments.find((department) => department.id === activeDeptId) ?? null;
  const activeDeptEntry = activeDepartment
    ? structure
        .flatMap((block) => block.departments.map((department) => ({ ...department, block: block.block })))
        .find((department) => department.deptId === activeDepartment.id) ?? null
    : null;
  const departmentTree = useMemo(
    () => activeDepartment
      ? buildCompactDepartmentHierarchy(people, {
          departmentId: activeDepartment.id,
          headEmployeeId: activeDepartment.head_employee_id,
        })
      : null,
    [activeDepartment, people],
  );

  function closePanels() {
    setSelectedEmployee(null);
    setSelectedDepartment(null);
    setEditingPerson(null);
  }

  async function saveHierarchy() {
    if (!editingPerson) return;
    setSavingHierarchy(true);
    setActionError(null);
    try {
      if (editAction === "remove-level") {
        await updateHierarchy({ action: "remove-level", employeeId: editingPerson.id });
      } else if (editAction === "insert") {
        await updateHierarchy({ action: "insert", candidateId: Number(candidateId), branchRootId: editingPerson.id });
      } else {
        await updateHierarchy({ action: "move", employeeId: editingPerson.id, managerEmployeeId: candidateId ? Number(candidateId) : null });
      }
      setEditingPerson(null);
      setCandidateId("");
      refetchEmployees();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể cập nhật sơ đồ");
    } finally {
      setSavingHierarchy(false);
    }
  }

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
      if (activeDeptId === deptId) setActiveDeptId(null);
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

  if (deptError || empError) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[14px] border border-[var(--color-border)] bg-white px-6 py-12 text-center">
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Không thể tải sơ đồ tổ chức</div>
        <div className="mt-2 max-w-[560px] text-[12.5px] text-[var(--color-danger)]">
          {[deptError, empError].filter(Boolean).join(" · ")}
        </div>
        <button
          type="button"
          onClick={() => {
            refetchDepts();
            refetchEmployees();
          }}
          className="mt-4 rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {modal && (
        <DeptFormModal
          initial={modal}
          saving={createMut.isLoading || updateMut.isLoading}
          onSave={handleSaveDept}
          onClose={() => setModal(null)}
        />
      )}
      {selectedEmployee && (
        <EmployeeQuickProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onViewFullProfile={(id) => onNavigate("employee-detail", String(id))}
        />
      )}
      {selectedDepartment && (
        <DepartmentInfoModal
          department={selectedDepartment}
          employees={(empData?.data ?? []).filter((employee) => employee.department_id === selectedDepartment.id)}
          head={(empData?.data ?? []).find((employee) => employee.id === selectDepartmentHeadId(people, {
            departmentId: selectedDepartment.id,
            headEmployeeId: selectedDepartment.head_employee_id,
          }))}
          onClose={() => setSelectedDepartment(null)}
          onViewDepartment={(id) => {
            const entry = structure.flatMap((block) => block.departments.map((department) => ({ ...department, block: block.block }))).find((department) => department.deptId === id);
            if (entry) setActiveDeptId(entry.deptId);
            setSelectedDepartment(null);
          }}
        />
      )}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setEditingPerson(null)}>
          <div className="w-full max-w-[480px] rounded-[14px] bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><div className="font-semibold">Sửa nhánh · {editingPerson.name}</div><button onClick={() => setEditingPerson(null)}><X size={18} /></button></div>
            <select value={editAction} onChange={(event) => { setEditAction(event.target.value as typeof editAction); setCandidateId(""); }} className="h-9 w-full rounded-[8px] border border-[var(--color-border)] px-2.5 text-[12.5px]">
              <option value="move">Đổi quản lý</option>
              <option value="insert">Chèn cấp quản lý</option>
              <option value="remove-level">Gỡ cấp quản lý</option>
            </select>
            {editAction !== "remove-level" && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] uppercase text-[var(--color-text-light)]">Chọn người quản lý đã có trong danh mục</div>
                <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="h-9 w-full rounded-[8px] border border-[var(--color-border)] px-2.5 text-[12.5px]">
                  <option value="">-- Chọn quản lý --</option>
                  {(editAction === "insert"
                    ? filterInsertManagerCandidates(editingPerson.id, people)
                    : filterManagerCandidates(editingPerson.id, people))
                    .filter((person) => person.departmentId === editingPerson.departmentId && isManagementRole(person))
                    .map((person) => <option key={person.id} value={person.id}>{person.name} — {person.position}</option>)}
                </select>
              </div>
            )}
            <div className="mt-3 rounded-[8px] bg-[var(--color-page-bg)] p-3 text-[12px] text-[var(--color-text-muted)]">
              {editAction === "remove-level"
                ? "Cấp dưới trực tiếp sẽ chuyển lên quản lý phía trên. Hồ sơ nhân viên không bị xóa."
                : "Hệ thống chỉ hiển thị nhân viên có chức vụ quản lý phù hợp và không tạo vòng lặp."}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditingPerson(null)} className="rounded-[8px] border px-4 py-2 text-[12px]">Huỷ</button><button disabled={savingHierarchy || (editAction !== "remove-level" && !candidateId)} onClick={saveHierarchy} className="rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50">{savingHierarchy ? "Đang lưu..." : "Xác nhận thay đổi"}</button></div>
          </div>
        </div>
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

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
          <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Cơ cấu tổ chức</div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setActiveDeptId(null); closePanels(); }}
              className={cn("mb-1 flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[13px] font-medium", !activeDepartment ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-primary)] hover:bg-[var(--color-page-bg)]")}
            >
              <Network size={15} /> Sơ đồ tổng
            </button>
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
                            activeDepartment?.id === d.deptId
                              ? "bg-[var(--color-accent)] text-white"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
                          )}
                        >
                          <button
                            onClick={() => { setActiveDeptId(d.deptId); closePanels(); }}
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
                                  activeDepartment?.id === d.deptId ? "hover:bg-white/20" : "hover:bg-[var(--color-border-light)]"
                                )}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteDept(d.deptId, d.dept, d.staff.length)}
                                title="Xóa"
                                className={cn(
                                  "rounded p-0.5",
                                  activeDepartment?.id === d.deptId ? "hover:bg-white/20" : "hover:bg-[var(--color-border-light)] hover:text-[var(--color-danger)]"
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

        <div className="min-w-0 rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          {!activeDepartment ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><div className="flex items-center gap-2 text-[15px] font-semibold"><Network size={17} className="text-[var(--color-accent)]" /> Sơ đồ tổng</div><div className="mt-1 text-[12px] text-[var(--color-text-light)]">{people.length} nhân sự · {departments.length} phòng ban</div></div>
              </div>
              <CompanyDepartmentChart
                departments={departments}
                people={people}
                onSelectDepartment={(department) => {
                  const entry = structure
                    .flatMap((block) => block.departments.map((item) => ({ ...item, block: block.block })))
                    .find((item) => item.deptId === department.id);
                  if (entry) {
                    setActiveDeptId(entry.deptId);
                  }
                  closePanels();
                }}
              />
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div><div className="flex items-center gap-2 text-[15px] font-semibold"><Users size={17} className="text-[var(--color-accent)]" /> {activeDepartment.name}</div><div className="mt-1 text-[12px] text-[var(--color-text-light)]">{activeDeptEntry?.block ?? activeDepartment.block} · {activeDeptEntry?.staff.length ?? 0} nhân sự</div></div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setSelectedDepartment(activeDepartment)} className="rounded-[8px] border border-[var(--color-border)] px-2.5 py-1 text-[12px]">Thông tin phòng ban</button>
                  {canEdit && <button onClick={() => setModal({ id: activeDepartment.id, name: activeDepartment.name, block: activeDepartment.block })} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-2.5 py-1 text-[12px]"><Pencil size={12} /> Sửa phòng ban</button>}
                </div>
              </div>
              {departmentTree && (
                <DepartmentManagementChart
                  tree={departmentTree}
                  onSelectEmployee={(person) => setSelectedEmployee((empData?.data ?? []).find((employee) => employee.id === person.id) ?? null)}
                  onEditEmployee={canEdit ? setEditingPerson : undefined}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
