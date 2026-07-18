"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Loader2,
  Printer,
  Camera,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { fetchEmployee, updateEmployee } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, formatMoney } from "@/lib/utils";

const TABS = ["Tổng hợp", "Công việc", "Cá nhân", "Lương & phụ cấp", "Bảo hiểm", "Hồ sơ đính kèm"];

type EditableFields = {
  name: string;
  gender: string;
  dob: string;
  phone: string;
  cccd: string;
  address: string;
  email: string;
  position: string;
  workplace: string;
  contract_type: string;
  contract_end: string;
  level: string;
  manager: string;
  status: string;
  bank: string;
  tax_code: string;
};

function Field({
  label,
  value,
  editing,
  field,
  form,
  onChange,
  type = "text",
  options,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  field?: keyof EditableFields;
  form?: EditableFields;
  onChange?: (field: keyof EditableFields, value: string) => void;
  type?: "text" | "date" | "select";
  options?: string[];
}) {
  if (editing && field && form && onChange) {
    const inputVal = form[field] ?? "";
    if (type === "select" && options) {
      return (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">{label}</div>
          <select
            value={inputVal}
            onChange={(e) => onChange(field, e.target.value)}
            className="mt-1 h-9 w-full rounded-[8px] border border-[var(--color-accent)] bg-white px-2.5 text-[13px] outline-none"
          >
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">{label}</div>
        <input
          type={type === "date" ? "date" : "text"}
          value={inputVal}
          onChange={(e) => onChange(field, e.target.value)}
          className="mt-1 h-9 w-full rounded-[8px] border border-[var(--color-accent)] px-2.5 text-[13px] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">{label}</div>
      <div className="mt-1 text-[13.5px] text-[var(--color-text-primary)]">{value ?? "-"}</div>
    </div>
  );
}

function PrintableProfile({
  employee,
  compensation,
  insurance,
  photoUrl,
}: {
  employee: Record<string, unknown>;
  compensation: Record<string, unknown> | null;
  insurance: Record<string, unknown> | null;
  photoUrl: string | null;
}) {
  return (
    <div className="print-profile hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-profile, .print-profile * { visibility: visible !important; }
          .print-profile {
            position: fixed; left: 0; top: 0; width: 100%;
            padding: 20mm; font-family: 'Times New Roman', serif;
            font-size: 13pt; color: #000;
          }
          @page { margin: 15mm; size: A4 portrait; }
        }
      `}</style>
      <div style={{ textAlign: "center", marginBottom: "16pt" }}>
        <div style={{ fontSize: "11pt", fontWeight: "bold" }}>CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY</div>
        <div style={{ fontSize: "16pt", fontWeight: "bold", marginTop: "8pt" }}>HỒ SƠ NHÂN VIÊN</div>
      </div>
      <div style={{ display: "flex", gap: "20pt", marginBottom: "14pt" }}>
        <div style={{ width: "90pt", height: "120pt", border: "1px solid #999", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "28pt", color: "#999" }}>{getInitials(String(employee.name ?? ""))}</span>
          )}
        </div>
        <div>
          <div style={{ fontSize: "16pt", fontWeight: "bold" }}>{String(employee.name ?? "")}</div>
          <div style={{ marginTop: "4pt" }}>Mã nhân viên: {String(employee.code ?? "")}</div>
          <div>Bộ phận: {String(employee.department_name ?? "-")}</div>
          <div>Chức vụ: {String(employee.position ?? "-")}</div>
          <div>Trạng thái: {String(employee.status ?? "-")}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14pt" }}>
        <tbody>
          {[
            ["Ngày sinh", formatDate(employee.dob as string)],
            ["Giới tính", employee.gender],
            ["CCCD", employee.cccd],
            ["Điện thoại", employee.phone],
            ["Email", employee.email],
            ["Địa chỉ", employee.address],
            ["Mã số thuế", employee.tax_code],
            ["Ngày vào làm", formatDate(employee.join_date as string)],
            ["Loại hợp đồng", employee.contract_type],
            ["Nơi làm việc", employee.workplace],
            ["Quản lý trực tiếp", employee.manager],
            ["Cấp bậc", employee.level],
            ["Tài khoản NH", employee.bank],
          ].map(([label, val], i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "4pt 8pt", fontWeight: "bold", width: "40%" }}>{String(label ?? "")}</td>
              <td style={{ padding: "4pt 8pt" }}>{String(val ?? "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {compensation && (
        <>
          <div style={{ fontWeight: "bold", fontSize: "13pt", marginBottom: "6pt" }}>Lương & phụ cấp</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14pt" }}>
            <tbody>
              {[
                ["Lương cơ bản", formatMoney(Number(compensation.base_salary ?? 0))],
                ["Phụ cấp", formatMoney(Number(compensation.allowance ?? 0))],
                ["Số phụ thuộc", compensation.dependents],
              ].map(([label, val], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "4pt 8pt", fontWeight: "bold", width: "40%" }}>{String(label ?? "")}</td>
                  <td style={{ padding: "4pt 8pt" }}>{String(val ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {insurance && (
        <>
          <div style={{ fontWeight: "bold", fontSize: "13pt", marginBottom: "6pt" }}>Bảo hiểm</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Tình trạng BHXH", insurance.status],
                ["Mã BHXH", insurance.ins_code],
                ["Sổ BHXH", insurance.bhxh_book],
                ["Mã thẻ BHYT", insurance.bhyt_code],
                ["Nơi khám BHYT", insurance.bhyt_clinic],
                ["Ngày bắt đầu đóng", formatDate(insurance.start_date as string)],
                ["Mức lương đóng BH", formatMoney(Number(insurance.salary_base ?? 0))],
              ].map(([label, val], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "4pt 8pt", fontWeight: "bold", width: "40%" }}>{String(label ?? "")}</td>
                  <td style={{ padding: "4pt 8pt" }}>{String(val ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <div style={{ marginTop: "30pt", display: "flex", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold" }}>Nhân viên</div>
          <div style={{ marginTop: "50pt" }}>{String(employee.name ?? "")}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: "bold" }}>Phòng Nhân sự</div>
          <div style={{ marginTop: "50pt" }}>______________</div>
        </div>
      </div>
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
  const { role } = useAuth();
  const canEdit = role === "super" || role === "hr";

  const fetcher = useCallback(
    () => (employeeId ? fetchEmployee(employeeId) : Promise.reject("No ID")),
    [employeeId],
  );

  const { data, isLoading, refetch } = useQuery(fetcher, [employeeId]);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableFields | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: doUpdate, isLoading: isSaving } = useMutation(
    (id: string, payload: Record<string, unknown>) => updateEmployee(id, payload),
  );

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

  const currentPhoto = photoPreview ?? photoUrl ?? employee.photo_url;

  function startEditing() {
    if (!employee) return;
    setForm({
      name: employee.name ?? "",
      gender: employee.gender ?? "",
      dob: employee.dob ?? "",
      phone: employee.phone ?? "",
      cccd: employee.cccd ?? "",
      address: employee.address ?? "",
      email: employee.email ?? "",
      position: employee.position ?? "",
      workplace: employee.workplace ?? "",
      contract_type: employee.contract_type ?? "",
      contract_end: employee.contract_end ?? "",
      level: employee.level ?? "",
      manager: employee.manager ?? "",
      status: employee.status ?? "",
      bank: employee.bank ?? "",
      tax_code: employee.tax_code ?? "",
    });
    setEditing(true);
    setSaveSuccess(false);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
    setPhotoPreview(null);
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!form || !employeeId) return;
    try {
      await doUpdate(employeeId, { ...form });
      setEditing(false);
      setForm(null);
      if (photoPreview) setPhotoUrl(photoPreview);
      setPhotoPreview(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch {
      // error is shown via useMutation
    }
  }

  function handleFieldChange(field: keyof EditableFields, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-4">
      <PrintableProfile
        employee={employee as unknown as Record<string, unknown>}
        compensation={compensation as unknown as Record<string, unknown> | null}
        insurance={insurance as unknown as Record<string, unknown> | null}
        photoUrl={currentPhoto ?? null}
      />

      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => onNavigate("employees")}
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={14} /> Quay lại danh sách nhân viên
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
        >
          <Printer size={14} /> In hồ sơ
        </button>
      </div>

      {saveSuccess && (
        <div className="rounded-[10px] bg-[var(--color-success-bg)] px-4 py-2.5 text-[12.5px] font-medium text-[var(--color-success)] print:hidden">
          Đã lưu thông tin nhân viên thành công.
        </div>
      )}

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px] print:hidden">
        <div className="flex flex-wrap items-center gap-5">
          <div className="group relative">
            <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--color-page-bg)]">
              {currentPhoto ? (
                <img src={currentPhoto} alt={employee.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[20px] font-semibold text-[var(--color-text-lighter)]">
                  {getInitials(employee.name)}
                </span>
              )}
            </div>
            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Tải ảnh lên"
                >
                  <Camera size={18} className="text-white" />
                </button>
              </>
            )}
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
            {canEdit && !currentPhoto && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--color-accent)] hover:underline"
              >
                <Upload size={12} /> Tải ảnh nhân viên
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white print:hidden">
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
          {canEdit && (
            <div className="flex gap-2 py-2">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded-[8px] bg-[var(--color-success)] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {isSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)]"
                  >
                    <X size={13} /> Huỷ
                  </button>
                </>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                >
                  <Pencil size={13} /> Chỉnh sửa
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-[18px]">
          {tab === 0 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Bộ phận" value={employee.department_name} />
                <Field
                  label="Chức vụ"
                  value={employee.position}
                  editing={editing}
                  field="position"
                  form={form!}
                  onChange={handleFieldChange}
                />
                <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
                <Field
                  label="Trạng thái"
                  value={employee.status}
                  editing={editing}
                  field="status"
                  form={form!}
                  onChange={handleFieldChange}
                  type="select"
                  options={["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"]}
                />
                <Field
                  label="Nơi làm việc"
                  value={employee.workplace}
                  editing={editing}
                  field="workplace"
                  form={form!}
                  onChange={handleFieldChange}
                />
                <Field
                  label="Cấp bậc"
                  value={employee.level}
                  editing={editing}
                  field="level"
                  form={form!}
                  onChange={handleFieldChange}
                />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Bộ phận" value={employee.department_name} />
              <Field
                label="Chức vụ"
                value={employee.position}
                editing={editing}
                field="position"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Cấp bậc"
                value={employee.level}
                editing={editing}
                field="level"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
              <Field
                label="Quản lý trực tiếp"
                value={employee.manager}
                editing={editing}
                field="manager"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Nơi làm việc"
                value={employee.workplace}
                editing={editing}
                field="workplace"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Loại hợp đồng"
                value={employee.contract_type ?? "Không xác định"}
                editing={editing}
                field="contract_type"
                form={form!}
                onChange={handleFieldChange}
                type="select"
                options={["Không xác định thời hạn", "Xác định thời hạn", "Thử việc", "Thời vụ"]}
              />
              {(editing || employee.contract_end) && (
                <Field
                  label="Ngày hết hạn HĐ"
                  value={formatDate(employee.contract_end)}
                  editing={editing}
                  field="contract_end"
                  form={form!}
                  onChange={handleFieldChange}
                  type="date"
                />
              )}
              <Field
                label="Trạng thái"
                value={employee.status}
                editing={editing}
                field="status"
                form={form!}
                onChange={handleFieldChange}
                type="select"
                options={["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"]}
              />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field
                label="Ngày sinh"
                value={formatDate(employee.dob)}
                editing={editing}
                field="dob"
                form={form!}
                onChange={handleFieldChange}
                type="date"
              />
              <Field
                label="Giới tính"
                value={employee.gender}
                editing={editing}
                field="gender"
                form={form!}
                onChange={handleFieldChange}
                type="select"
                options={["Nam", "Nữ"]}
              />
              <Field
                label="CCCD"
                value={employee.cccd}
                editing={editing}
                field="cccd"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Mã số thuế"
                value={employee.tax_code}
                editing={editing}
                field="tax_code"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Điện thoại"
                value={employee.phone}
                editing={editing}
                field="phone"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Email"
                value={employee.email}
                editing={editing}
                field="email"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field
                label="Địa chỉ"
                value={employee.address}
                editing={editing}
                field="address"
                form={form!}
                onChange={handleFieldChange}
              />
              <Field label="Số phụ thuộc" value={compensation?.dependents ?? 0} />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field
                label="Lương cơ bản"
                value={compensation?.base_salary ? formatMoney(compensation.base_salary) : "-"}
              />
              <Field
                label="Phụ cấp"
                value={compensation?.allowance ? formatMoney(compensation.allowance) : "-"}
              />
              <Field
                label="Tài khoản ngân hàng"
                value={employee.bank}
                editing={editing}
                field="bank"
                form={form!}
                onChange={handleFieldChange}
              />
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
                value={insurance?.salary_base ? formatMoney(insurance.salary_base) : "-"}
              />
            </div>
          )}

          {tab === 5 && (
            <div className="flex flex-col gap-4">
              <div className="text-[13px] text-[var(--color-text-muted)]">
                {canEdit
                  ? "Tải lên hồ sơ đính kèm (hợp đồng, bằng cấp, CCCD, ...)."
                  : "Chưa có hồ sơ đính kèm."}
              </div>
              {canEdit && (
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-[var(--color-border)] px-4 py-3 text-[12.5px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                  <Upload size={16} />
                  Chọn tệp để tải lên
                  <input type="file" className="hidden" multiple />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-2.5 text-[12.5px] text-[var(--color-warning)] print:hidden">
          <UserIcon size={15} />
          Bạn đang xem ở chế độ chỉ đọc. Liên hệ HR để chỉnh sửa thông tin.
        </div>
      )}
    </div>
  );
}
