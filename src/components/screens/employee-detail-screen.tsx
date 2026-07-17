"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, Pencil, Save, X, Loader2 } from "lucide-react";
import { fetchEmployee, type ApiEmployee, type ApiCompensation, type ApiInsurance } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { getInitials, cn, formatDate } from "@/lib/utils";

const TABS = ["Tổng hợp", "Công việc", "Cá nhân", "Lương & phụ cấp", "Bảo hiểm", "Hồ sơ đính kèm"];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">{label}</div>
      <div className="mt-1 text-[13.5px] text-[var(--color-text-primary)]">{value ?? "-"}</div>
    </div>
  );
}

export function EmployeeDetailScreen({
  employeeId,
  onNavigate,
}: {
  employeeId?: string;
  onNavigate: (screen: string) => void;
}) {
  const fetcher = useCallback(
    () => (employeeId ? fetchEmployee(employeeId) : Promise.reject("No ID")),
    [employeeId],
  );

  const { data, isLoading } = useQuery(fetcher, [employeeId]);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => onNavigate("employees")}
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={14} /> Quay lại danh sách nhân viên
        </button>
        <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
          <Loader2 size={20} className="animate-spin" />
          <span className="ml-2 text-[13px]">Đang tải thông tin nhân viên...</span>
        </div>
      </div>
    );
  }

  const employee = data?.employee;
  const compensation = data?.compensation;
  const insurance = data?.insurance;

  if (!employee) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => onNavigate("employees")}
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={14} /> Quay lại danh sách nhân viên
        </button>
        <div className="text-[13px] text-[var(--color-text-muted)]">Không tìm thấy nhân viên.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => onNavigate("employees")}
        className="flex w-fit items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={14} /> Quay lại danh sách nhân viên
      </button>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-16 items-center justify-center rounded-[10px] bg-[var(--color-page-bg)] text-[20px] font-semibold text-[var(--color-text-lighter)]">
            {getInitials(employee.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[16px] font-semibold text-[var(--color-text-primary)]">{employee.name}</div>
              <span className="rounded-[20px] bg-[var(--color-page-bg)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                {employee.code}
              </span>
              <span
                className={cn(
                  "rounded-[20px] px-2 py-0.5 text-[11px] font-medium",
                  employee.status === "Đang làm việc"
                    ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                    : "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]"
                )}
              >
                {employee.status}
              </span>
            </div>
            <div className="mt-1 text-[13px] text-[var(--color-text-muted)]">
              {employee.position ?? "Nhân viên"} · {employee.department_name ?? "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-3 text-[13px]",
                  tab === i
                    ? "border-[var(--color-accent)] font-medium text-[var(--color-accent)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 py-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded-[8px] bg-[var(--color-success)] px-3 py-1.5 text-[12px] font-medium text-white"
                >
                  <Save size={13} /> Lưu
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)]"
                >
                  <X size={13} /> Huỷ
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
              >
                <Pencil size={13} /> Chỉnh sửa
              </button>
            )}
          </div>
        </div>

        <div className="p-[18px]">
          {tab === 0 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Bộ phận" value={employee.department_name} />
                <Field label="Chức vụ" value={employee.position} />
                <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
                <Field label="Trạng thái" value={employee.status} />
                <Field label="Nơi làm việc" value={employee.workplace} />
                <Field label="Cấp bậc" value={employee.level} />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Bộ phận" value={employee.department_name} />
              <Field label="Chức vụ" value={employee.position} />
              <Field label="Cấp bậc" value={employee.level} />
              <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
              <Field label="Quản lý trực tiếp" value={employee.manager} />
              <Field label="Nơi làm việc" value={employee.workplace} />
              <Field label="Loại hợp đồng" value={employee.contract_type ?? "Không xác định"} />
              {employee.contract_end && <Field label="Ngày hết hạn HĐ" value={formatDate(employee.contract_end)} />}
              <Field label="Trạng thái" value={employee.status} />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Ngày sinh" value={formatDate(employee.dob)} />
              <Field label="Giới tính" value={employee.gender} />
              <Field label="CCCD" value={employee.cccd} />
              <Field label="Mã số thuế" value={employee.tax_code} />
              <Field label="Điện thoại" value={employee.phone} />
              <Field label="Email" value={employee.email} />
              <Field label="Địa chỉ" value={employee.address} />
              <Field label="Số phụ thuộc" value={compensation?.dependents ?? 0} />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field
                label="Lương cơ bản"
                value={compensation?.base_salary ? `${compensation.base_salary.toLocaleString()} đ` : "-"}
              />
              <Field
                label="Phụ cấp"
                value={compensation?.allowance ? `${compensation.allowance.toLocaleString()} đ` : "-"}
              />
              <Field label="Tài khoản ngân hàng" value={employee.bank} />
            </div>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Tình trạng BHXH" value={insurance?.status ?? "Chưa tham gia"} />
              <Field label="Mã BHXH" value={insurance?.ins_code} />
              <Field label="Sổ BHXH" value={insurance?.bhxh_book} />
              <Field label="Mã thẻ BHYT" value={insurance?.bhyt_code} />
              <Field label="Nơi khám BHYT" value={insurance?.bhyt_clinic} />
              <Field
                label="Ngày bắt đầu đóng"
                value={insurance?.start_date ? formatDate(insurance.start_date) : "-"}
              />
              <Field
                label="Mức lương đóng BH"
                value={insurance?.salary_base ? `${insurance.salary_base.toLocaleString()} đ` : "-"}
              />
            </div>
          )}

          {tab === 5 && (
            <div className="text-[13px] text-[var(--color-text-muted)]">Chưa có hồ sơ đính kèm.</div>
          )}
        </div>
      </div>
    </div>
  );
}
