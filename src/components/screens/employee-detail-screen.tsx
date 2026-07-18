"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  FileText,
} from "lucide-react";
import { fetchEmployee, updateEmployee, type ApiEmployee, type ApiCompensation, type ApiInsurance } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, formatMoney, seededRandom } from "@/lib/utils";

const TABS = ["Tổng hợp", "Công việc", "Cá nhân", "Lương & phụ cấp", "Bảo hiểm", "Hồ sơ đính kèm"];

type EditableFields = {
  position: string;
  workplace: string;
  contract_type: string;
  contract_end: string;
  level: string;
  manager: string;
  status: string;
  bank: string;
  tax_code: string;
  address: string;
  email: string;
  phone: string;
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

function mask(val: string | null | undefined, showLast = 3): string {
  if (!val) return "-";
  const s = String(val);
  if (s.length <= showLast + 3) return s;
  return s.slice(0, 3) + "*".repeat(s.length - 3 - showLast) + s.slice(-showLast);
}

const SKILL_POOL = [
  "Vận hành CNC-02", "Lập trình G-code", "Đo lường CMM", "An toàn LĐ",
  "Hàn TIG/MIG", "Cắt dây EDM", "Đọc bản vẽ kỹ thuật", "Dập nguội",
  "Tiện CNC", "Phay CNC", "QC kiểm tra", "Bảo trì máy",
  "Xử lý bề mặt", "Cắt laser", "Nhiệt luyện",
];

const MOCK_FILES = [
  { name: "CV xin việc.pdf", date: "12/03/2019" },
  { name: "Đơn xin việc.pdf", date: "12/03/2019" },
  { name: "Hợp đồng lao động.pdf", date: "12/03/2019" },
  { name: "CCCD (scan).pdf", date: "12/03/2019" },
];

function PrintPreviewModal({
  employee,
  compensation,
  insurance,
  photoUrl,
  onClose,
}: {
  employee: ApiEmployee;
  compensation: ApiCompensation | null;
  insurance: ApiInsurance | null;
  photoUrl: string | null;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const kpiScore = useMemo(() => seededRandom(employee.name + "kpi", 65, 98), [employee.name]);
  const kpiRank = kpiScore >= 90 ? "Tốt" : kpiScore >= 70 ? "Khá" : kpiScore >= 50 ? "TB" : "Yếu";

  const kpi6m = useMemo(() => {
    const months = ["01", "02", "03", "04", "05", "06"];
    return months.map((m) => ({
      month: m,
      score: seededRandom(employee.name + m, 60, 98),
    }));
  }, [employee.name]);

  const attendance = useMemo(() => ({
    stdDays: 26,
    overtime: seededRandom(employee.name + "ot", 0, 20) + "h",
    leave: seededRandom(employee.name + "lv", 0, 2),
    shifts: `${seededRandom(employee.name + "sh1", 2, 6)}/${seededRandom(employee.name + "sh2", 10, 14)}`,
    late: seededRandom(employee.name + "late", 0, 3),
    holiday: 0,
  }), [employee.name]);

  const skills = useMemo(() => {
    const count = seededRandom(employee.name + "sk", 3, 6);
    const start = seededRandom(employee.name + "sk0", 0, SKILL_POOL.length - 1);
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(SKILL_POOL[(start + i) % SKILL_POOL.length]);
    }
    return result;
  }, [employee.name]);

  const skillScore = useMemo(() => seededRandom(employee.name + "sks", 40, 85), [employee.name]);

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Hồ sơ ${employee.name}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #222; line-height: 1.4; }
        .page { width: 100%; }
      </style>
    </head><body>`);
    w.document.write(el.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  const P = { fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "9pt", color: "#222", lineHeight: "1.45" };
  const sectionTitle: React.CSSProperties = { fontSize: "9pt", fontWeight: 700, color: "#1a5276", borderBottom: "1.5px solid #1a5276", paddingBottom: "3px", marginBottom: "6px", marginTop: "14px", textTransform: "uppercase" as const };
  const cellLabel: React.CSSProperties = { padding: "3px 0", fontSize: "8.5pt", color: "#555", width: "42%" };
  const cellVal: React.CSSProperties = { padding: "3px 0", fontSize: "8.5pt", fontWeight: 500 };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:hidden">
      <div className="relative my-4 w-full max-w-[820px]">
        <div className="mb-3 flex items-center justify-between rounded-[10px] bg-white px-4 py-2.5 shadow-sm">
          <div className="text-[12.5px] text-[var(--color-text-muted)]">Xem trước bản in hồ sơ</div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-success)] px-4 py-1.5 text-[12.5px] font-medium text-white"
            >
              <Printer size={14} /> In / Xuất PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-[8px] border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] text-[var(--color-text-secondary)]"
            >
              Đóng
            </button>
          </div>
        </div>

        <div
          ref={printRef}
          className="rounded-[6px] bg-white shadow-lg"
          style={{ width: "794px", minHeight: "1123px", margin: "0 auto", padding: "28px 32px", ...P }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
              <div>
                <div style={{ fontSize: "11pt", fontWeight: 700, color: "#1a3a5c" }}>CÔNG TY TNHH CƠ KHÍ</div>
                <div style={{ fontSize: "11pt", fontWeight: 700, color: "#1a3a5c" }}>KHUÔN MẪU TIẾN HUY</div>
                <div style={{ fontSize: "7.5pt", color: "#888" }}>Số hồ sơ: {employee.code} · Kỳ đính kèm: 06/2026</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14pt", fontWeight: 700, color: "#1a3a5c" }}>HỒ SƠ NHÂN VIÊN</div>
              <div style={{ fontSize: "8pt", color: "#888" }}>Lập ngày: 01/07/2026</div>
            </div>
          </div>

          <div style={{ borderTop: "2px solid #1a5276", marginBottom: "14px" }} />

          {/* Employee info bar */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "14px", alignItems: "center" }}>
            <div style={{ width: "70px", height: "85px", border: "1px solid #ccc", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f4f6f8", overflow: "hidden" }}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "22pt", color: "#aaa", fontWeight: 600 }}>{getInitials(employee.name)}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14pt", fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: "9pt", color: "#555" }}>{employee.position ?? "Nhân viên"} - {employee.department_name ?? "-"}</div>
              <div style={{ fontSize: "8.5pt", color: "#888", marginTop: "2px" }}>Đánh giá KPI tháng 06: <b style={{ color: "#1a5276" }}>{kpiScore} điểm</b> - {kpiRank}</div>
            </div>
            <div style={{ textAlign: "center", border: "2px solid #2980b9", borderRadius: "8px", padding: "6px 14px", flexShrink: 0 }}>
              <div style={{ fontSize: "7.5pt", color: "#555" }}>KPI tháng 06</div>
              <div style={{ fontSize: "22pt", fontWeight: 700, color: "#2980b9", lineHeight: 1 }}>{kpiScore}</div>
              <div style={{ fontSize: "8pt", color: kpiScore >= 70 ? "#27ae60" : "#e67e22", fontWeight: 600 }}>{kpiRank}</div>
            </div>
          </div>

          {/* THÔNG TIN CÔNG VIỆC + CÁ NHÂN */}
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={sectionTitle}>THÔNG TIN CÔNG VIỆC</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Bộ phận", employee.department_name],
                    ["Chức vụ", employee.position],
                    ["Vị trí làm việc", `${employee.workplace ?? "-"} - Máy CNC-02`],
                    ["Ngày vào làm", formatDate(employee.join_date)],
                    ["Loại hợp đồng", employee.contract_type],
                    ["Quản lý trực tiếp", employee.manager],
                    ["Cấp bậc", employee.level],
                    ["Trạng thái", employee.status],
                    ["Ngày xin thôi việc", employee.resign_request_date ? formatDate(employee.resign_request_date) : "-"],
                    ["Ngày chính thức nghỉ", employee.resign_date ? formatDate(employee.resign_date) : "-"],
                  ].map(([l, v], i) => (
                    <tr key={i}><td style={cellLabel}>{l}</td><td style={cellVal}>{v ?? "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1 }}>
              <div style={sectionTitle}>THÔNG TIN CÁ NHÂN</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Ngày sinh", formatDate(employee.dob)],
                    ["Giới tính", employee.gender],
                    ["CCCD", mask(employee.cccd, 0)],
                    ["Địa chỉ", employee.address ? (employee.address.length > 25 ? "****· " + employee.address.split(",").pop()?.trim() : employee.address) : "-"],
                    ["SĐT", mask(employee.phone)],
                    ["Tài khoản NH", mask(employee.bank, 4)],
                    ["Mã số thuế", mask(employee.tax_code)],
                    ["Mã BHXH", insurance?.ins_code ? mask(insurance.ins_code) : "-"],
                    ["Hồ sơ BHYT", insurance?.bhyt_code ? mask(insurance.bhyt_code) : "-"],
                  ].map(([l, v], i) => (
                    <tr key={i}><td style={cellLabel}>{l}</td><td style={cellVal}>{v ?? "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LƯƠNG & BẢO HIỂM */}
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={sectionTitle}>LƯƠNG & PHỤ CẤP</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Lương cơ bản", compensation ? formatMoney(compensation.base_salary) : "-"],
                    ["Phụ cấp cố định", compensation ? formatMoney(compensation.allowance) : "-"],
                    ["Người phụ thuộc", compensation?.dependents ?? 0],
                  ].map(([l, v], i) => (
                    <tr key={i}><td style={cellLabel}>{l}</td><td style={cellVal}>{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1 }}>
              <div style={sectionTitle}>BẢO HIỂM XÃ HỘI</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Trạng thái BHXH", insurance?.status ?? "-"],
                    ["Mã đơn vị BHXH", insurance?.ins_code ? mask(insurance.ins_code) : "-"],
                    ["Số sổ BHXH", insurance?.bhxh_book ? mask(insurance.bhxh_book) : "-"],
                    ["Mã thẻ BHYT", insurance?.bhyt_code ? mask(insurance.bhyt_code) : "-"],
                    ["Nơi KCB ban đầu", insurance?.bhyt_clinic ?? "-"],
                    ["Ngày bắt đầu đóng", insurance?.start_date ? formatDate(insurance.start_date) : "-"],
                    ["Mức lương đóng BH", insurance?.salary_base ? formatMoney(insurance.salary_base) : "-"],
                  ].map(([l, v], i) => (
                    <tr key={i}><td style={cellLabel}>{l}</td><td style={cellVal}>{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHẤM CÔNG */}
          <div style={sectionTitle}>CHẤM CÔNG 06/2026</div>
          <div style={{ display: "flex", gap: "30px", fontSize: "8.5pt" }}>
            {[
              ["Công chuẩn", attendance.stdDays],
              ["Tăng ca", attendance.overtime],
              ["Đi trễ", attendance.leave],
              ["Phép/nghỉ đã dùng", attendance.shifts],
              ["Vắng KP", 0],
              ["Nghỉ lễ", attendance.holiday],
            ].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: "#555" }}>{l}</span>
                <b>{String(v)}</b>
              </div>
            ))}
          </div>

          {/* KPI 6 THÁNG */}
          <div style={sectionTitle}>DIỄN BIẾN KPI 6 THÁNG</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "80px", marginTop: "6px" }}>
            {kpi6m.map((k) => {
              const h = Math.round((k.score / 100) * 70);
              const color = k.score >= 85 ? "#27ae60" : k.score >= 70 ? "#2980b9" : "#e67e22";
              return (
                <div key={k.month} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "7.5pt", fontWeight: 600, marginBottom: "2px" }}>{k.score}</div>
                  <div style={{ height: `${h}px`, background: color, borderRadius: "3px 3px 0 0", margin: "0 auto", width: "28px" }} />
                  <div style={{ fontSize: "7pt", color: "#888", marginTop: "2px" }}>{k.month}</div>
                </div>
              );
            })}
          </div>

          {/* KỸ NĂNG */}
          <div style={sectionTitle}>KỸ NĂNG / CÔNG ĐOẠN</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "4px", alignItems: "center" }}>
            {skills.map((s) => (
              <span key={s} style={{ border: "1px solid #2980b9", borderRadius: "12px", padding: "2px 10px", fontSize: "8pt", color: "#2980b9" }}>{s}</span>
            ))}
            <span style={{ fontSize: "8pt", color: "#555", marginLeft: "8px" }}>An toàn LĐ: <b>{skillScore}</b></span>
          </div>

          {/* HỒ SƠ ĐÍNH KÈM */}
          <div style={sectionTitle}>HỒ SƠ ĐÍNH KÈM</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "2px", fontSize: "8.5pt" }}>
            {MOCK_FILES.map((f) => (
              <div key={f.name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#333" }}>{f.name}</span>
                <span style={{ color: "#888" }}>{f.name.replace(".pdf", "")}: {f.date}</span>
              </div>
            ))}
          </div>

          {/* SIGNATURE BLOCKS */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", textAlign: "center" as const, fontSize: "9pt" }}>
            <div style={{ width: "30%" }}>
              <div style={{ fontWeight: 700 }}>NGƯỜI LẬP</div>
              <div style={{ fontSize: "7.5pt", color: "#888" }}>(Ký, họ tên)</div>
              <div style={{ marginTop: "45px", fontWeight: 500 }}>Ôn Thị Uy Lam</div>
            </div>
            <div style={{ width: "30%" }}>
              <div style={{ fontWeight: 700 }}>TRƯỞNG PHÒNG NS</div>
              <div style={{ fontSize: "7.5pt", color: "#888" }}>(Ký, họ tên)</div>
              <div style={{ marginTop: "45px" }} />
            </div>
            <div style={{ width: "30%" }}>
              <div style={{ fontWeight: 700 }}>BAN GIÁM ĐỐC</div>
              <div style={{ fontSize: "7.5pt", color: "#888" }}>(Ký, đóng dấu)</div>
              <div style={{ marginTop: "45px" }} />
            </div>
          </div>
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
  const [printOpen, setPrintOpen] = useState(false);
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

  const kpiScore = seededRandom(employee.name + "kpi", 65, 98);
  const kpiRank = kpiScore >= 90 ? "Tốt" : kpiScore >= 70 ? "Khá" : kpiScore >= 50 ? "TB" : "Yếu";

  function startEditing() {
    if (!employee) return;
    setForm({
      position: employee.position ?? "",
      workplace: employee.workplace ?? "",
      contract_type: employee.contract_type ?? "",
      contract_end: employee.contract_end ?? "",
      level: employee.level ?? "",
      manager: employee.manager ?? "",
      status: employee.status ?? "",
      bank: employee.bank ?? "",
      tax_code: employee.tax_code ?? "",
      address: employee.address ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
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

  return (
    <div className="flex flex-col gap-4">
      {printOpen && employee && (
        <PrintPreviewModal
          employee={employee}
          compensation={compensation ?? null}
          insurance={insurance ?? null}
          photoUrl={currentPhoto ?? null}
          onClose={() => setPrintOpen(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate("employees")}
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft size={14} /> Quay lại danh sách nhân viên
        </button>
        <button
          onClick={() => setPrintOpen(true)}
          className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-success)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
        >
          <FileText size={14} /> Xuất hồ sơ
        </button>
      </div>

      {saveSuccess && (
        <div className="rounded-[10px] bg-[var(--color-success-bg)] px-4 py-2.5 text-[12.5px] font-medium text-[var(--color-success)]">
          Đã lưu thông tin nhân viên thành công.
        </div>
      )}

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="flex flex-wrap items-center gap-5">
          <div className="group relative">
            <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--color-page-bg)]">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
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
          <div className="flex flex-col items-center rounded-[10px] border-2 border-[var(--color-accent)] px-4 py-2">
            <div className="text-[10px] text-[var(--color-text-muted)]">KPI tháng 06</div>
            <div className="font-[family-name:var(--font-mono)] text-[24px] font-bold text-[var(--color-accent)]">{kpiScore}</div>
            <div className={cn("text-[11px] font-semibold", kpiScore >= 70 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]")}>{kpiRank}</div>
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
                <Field label="Chức vụ" value={employee.position} editing={editing} field="position" form={form!} onChange={handleFieldChange} />
                <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
                <Field label="Trạng thái" value={employee.status} editing={editing} field="status" form={form!} onChange={handleFieldChange} type="select" options={["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"]} />
                <Field label="Nơi làm việc" value={employee.workplace} editing={editing} field="workplace" form={form!} onChange={handleFieldChange} />
                <Field label="Cấp bậc" value={employee.level} editing={editing} field="level" form={form!} onChange={handleFieldChange} />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Bộ phận" value={employee.department_name} />
              <Field label="Chức vụ" value={employee.position} editing={editing} field="position" form={form!} onChange={handleFieldChange} />
              <Field label="Cấp bậc" value={employee.level} editing={editing} field="level" form={form!} onChange={handleFieldChange} />
              <Field label="Ngày vào làm" value={formatDate(employee.join_date)} />
              <Field label="Quản lý trực tiếp" value={employee.manager} editing={editing} field="manager" form={form!} onChange={handleFieldChange} />
              <Field label="Nơi làm việc" value={employee.workplace} editing={editing} field="workplace" form={form!} onChange={handleFieldChange} />
              <Field label="Loại hợp đồng" value={employee.contract_type ?? "Không xác định"} editing={editing} field="contract_type" form={form!} onChange={handleFieldChange} type="select" options={["Không xác định thời hạn", "Xác định thời hạn", "Thử việc", "Thời vụ"]} />
              {(editing || employee.contract_end) && (
                <Field label="Ngày hết hạn HĐ" value={formatDate(employee.contract_end)} editing={editing} field="contract_end" form={form!} onChange={handleFieldChange} type="date" />
              )}
              <Field label="Trạng thái" value={employee.status} editing={editing} field="status" form={form!} onChange={handleFieldChange} type="select" options={["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"]} />
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Ngày sinh" value={formatDate(employee.dob)} />
              <Field label="Giới tính" value={employee.gender} />
              <Field label="CCCD" value={employee.cccd} />
              <Field label="Mã số thuế" value={employee.tax_code} editing={editing} field="tax_code" form={form!} onChange={handleFieldChange} />
              <Field label="Điện thoại" value={employee.phone} editing={editing} field="phone" form={form!} onChange={handleFieldChange} />
              <Field label="Email" value={employee.email} editing={editing} field="email" form={form!} onChange={handleFieldChange} />
              <Field label="Địa chỉ" value={employee.address} editing={editing} field="address" form={form!} onChange={handleFieldChange} />
              <Field label="Số phụ thuộc" value={compensation?.dependents ?? 0} />
            </div>
          )}

          {tab === 3 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Lương cơ bản" value={compensation?.base_salary ? formatMoney(compensation.base_salary) : "-"} />
              <Field label="Phụ cấp" value={compensation?.allowance ? formatMoney(compensation.allowance) : "-"} />
              <Field label="Tài khoản ngân hàng" value={employee.bank} editing={editing} field="bank" form={form!} onChange={handleFieldChange} />
            </div>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Tình trạng BHXH" value={insurance?.status ?? "Chưa tham gia"} />
              <Field label="Mã BHXH" value={insurance?.ins_code} />
              <Field label="Sổ BHXH" value={insurance?.bhxh_book} />
              <Field label="Mã thẻ BHYT" value={insurance?.bhyt_code} />
              <Field label="Nơi khám BHYT" value={insurance?.bhyt_clinic} />
              <Field label="Ngày bắt đầu đóng" value={insurance?.start_date ? formatDate(insurance.start_date) : "-"} />
              <Field label="Mức lương đóng BH" value={insurance?.salary_base ? formatMoney(insurance.salary_base) : "-"} />
            </div>
          )}

          {tab === 5 && (
            <div className="flex flex-col gap-4">
              <div className="text-[13px] text-[var(--color-text-muted)]">
                {canEdit ? "Tải lên hồ sơ đính kèm (hợp đồng, bằng cấp, CCCD, ...)." : "Chưa có hồ sơ đính kèm."}
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
        <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-warning-bg)] px-4 py-2.5 text-[12.5px] text-[var(--color-warning)]">
          <UserIcon size={15} />
          Bạn đang xem ở chế độ chỉ đọc. Liên hệ HR để chỉnh sửa thông tin.
        </div>
      )}
    </div>
  );
}
