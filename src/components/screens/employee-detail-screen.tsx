"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { employees } from "@/lib/data/employees";
import { getInitials, hashName, cn, formatDate } from "@/lib/utils";

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
  const employee = useMemo(
    () => employees.find((e) => e.code === employeeId) ?? employees[0],
    [employeeId]
  );
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);

  const kpiTrend = useMemo(() => {
    const base = hashName(employee?.name ?? "x");
    return Array.from({ length: 6 }, (_, i) => 60 + ((base + i * 13) % 35));
  }, [employee]);

  const attendanceRate = 90 + (hashName((employee?.name ?? "x") + "att") % 10);
  const leaveUsed = hashName((employee?.name ?? "x") + "lv") % 8;
  const leaveTotal = 12;

  if (!employee) {
    return <div className="text-[13px] text-[var(--color-text-muted)]">Không tìm thấy nhân viên.</div>;
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
            {getInitials(employee.name ?? "?")}
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
              {employee.position ?? "Nhân viên"} · {employee.department}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--color-text-lighter)]">Điểm KPI</div>
            <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold text-[var(--color-accent)]">
              {kpiTrend[kpiTrend.length - 1]}
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
              <div>
                <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Xu hướng KPI 6 tháng
                </div>
                <div className="flex h-28 items-end gap-3">
                  {kpiTrend.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-[4px] bg-[var(--color-accent)]"
                        style={{ height: `${v}%` }}
                      />
                      <span className="text-[10px] text-[var(--color-text-lighter)]">T{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Tỷ lệ chuyên cần" value={`${attendanceRate}%`} />
                <Field label="Đi trễ tháng" value={hashName(employee.name + "l") % 4} />
                <Field label="Tăng ca (giờ)" value={hashName(employee.name + "o") % 20} />
                <Field label="Xếp hạng tổ" value={`Top ${1 + (hashName(employee.name) % 10)}`} />
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Phép năm</div>
                <div className="h-2.5 w-full rounded-full bg-[var(--color-page-bg)]">
                  <div
                    className="h-2.5 rounded-full bg-[var(--color-warning)]"
                    style={{ width: `${(leaveUsed / leaveTotal) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                  Đã dùng {leaveUsed}/{leaveTotal} ngày
                </div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Kỹ năng</div>
                <div className="flex flex-wrap gap-2">
                  {(["CNC", "Hàn", "Đọc bản vẽ", "An toàn lao động"]).map((s: string) => (
                    <span
                      key={s}
                      className="rounded-[20px] bg-[var(--color-page-bg)] px-2.5 py-1 text-[11.5px] text-[var(--color-text-muted)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Bộ phận" value={employee.department} />
              <Field label="Chức vụ" value={employee.position} />
              <Field label="Cấp bậc" value={employee.level} />
              <Field label="Ngày vào làm" value={formatDate(employee.joinDate)} />
              <Field label="Quản lý trực tiếp" value={employee.manager ?? "-"} />
              <Field label="Nơi làm việc" value={employee.workplace ?? "-"} />
              <Field label="Loại hợp đồng" value={employee.contractType ?? "Không xác định"} />
              {employee.contractEnd && <Field label="Ngày hết hạn HĐ" value={formatDate(employee.contractEnd)} />}
              <Field label="Trạng thái" value={employee.status} />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Ngày sinh" value={formatDate(employee.dob)} />
              <Field label="Giới tính" value={employee.gender ?? "-"} />
              <Field label="CCCD" value={employee.cccd ?? "-"} />
              <Field label="Mã số thuế" value={employee.taxCode ?? "-"} />
              <Field label="Điện thoại" value={employee.phone ?? "-"} />
              <Field label="Email" value={employee.email ?? "-"} />
              <Field label="Địa chỉ" value={employee.address ?? "-"} />
              <Field label="Số phụ thuộc" value={employee.dependents ?? 0} />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Lương cơ bản" value={employee.baseSalary ? `${employee.baseSalary.toLocaleString()} đ` : "-"} />
              <Field label="Phụ cấp" value={employee.allowance ? `${employee.allowance.toLocaleString()} đ` : "-"} />
              <Field label="Tài khoản ngân hàng" value={employee.bank ?? "-"} />
            </div>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Tình trạng BHXH" value={employee.insStatus} />
              <Field label="Mã BHXH" value={employee.insCode || "-"} />
              <Field label="Sổ BHXH" value={employee.bhxhBook || "-"} />
              <Field label="Mã thẻ BHYT" value={employee.bhytCode || "-"} />
              <Field label="Nơi khám BHYT" value={employee.bhytClinic || "-"} />
              <Field label="Ngày bắt đầu đóng" value={employee.insStartDate ? formatDate(employee.insStartDate) : "-"} />
              <Field
                label="Mức lương đóng BH"
                value={employee.insSalaryBase ? `${employee.insSalaryBase.toLocaleString()} đ` : "-"}
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
