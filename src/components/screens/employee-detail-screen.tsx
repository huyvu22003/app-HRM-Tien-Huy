"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TrendingUp,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { fetchEmployee, updateEmployee, uploadEmployeeAvatar, fetchDepartments, type ApiEmployee, type ApiCompensation, type ApiInsurance, type ApiDepartment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@/lib/hooks";
import { getInitials, cn, formatDate, formatMoney, seededRandom } from "@/lib/utils";
import { getEmployeePhoto, setEmployeePhoto } from "@/lib/photo-store";
import { getCustomFields, getCustomValues, setCustomValues, hydrateCustomData, type CustomField } from "@/lib/custom-fields";
import { getRaises, addRaise, deleteRaise, type SalaryRaise } from "@/lib/salary-history";

const TABS = ["Tổng hợp", "Công việc", "Cá nhân", "Lương & phụ cấp", "Bảo hiểm", "Hồ sơ đính kèm"];
// Tab "Cột tùy chỉnh" chỉ xuất hiện khi có cột tùy chỉnh — nằm sau các tab cố định.
const CUSTOM_TAB = TABS.length;

type EditableFields = {
  code: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  cccd: string;
  address: string;
  email: string;
  department_name: string;
  position: string;
  workplace: string;
  contract_type: string;
  contract_end: string;
  join_date: string;
  resign_date: string;
  level: string;
  manager: string;
  status: string;
  bank: string;
  tax_code: string;
  ins_status: string;
  ins_code: string;
  bhxh_book: string;
  bhyt_code: string;
  bhyt_clinic: string;
  ins_start_date: string;
  ins_salary_base: string;
  base_salary: string;
  allowance: string;
  dependents: string;
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

/** Trường chỉ đọc (hồ sơ mở rộng nhập từ import) — hiển thị, chưa cho sửa. */
function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
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

function SalaryHistorySection({
  employeeCode,
  currentBase,
  canEdit,
  onChanged,
}: {
  employeeCode: string;
  currentBase: number;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [raises, setRaises] = useState<SalaryRaise[]>([]);
  const [adding, setAdding] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [allowance, setAllowance] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setRaises(getRaises(employeeCode));
  }, [employeeCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load salary history from storage
    reload();
  }, [reload]);

  // Danh sách sắp xếp mới nhất trước. Mức tăng của mỗi dòng so với lần điều
  // chỉnh cũ hơn kế tiếp; lần điều chỉnh sớm nhất là mốc khởi điểm (không có
  // mức tăng để so sánh vì không rõ lương trước khi ghi nhận lịch sử).
  const rows = raises.map((r, i) => {
    const delta = i < raises.length - 1 ? r.baseSalary - raises[i + 1].baseSalary : null;
    return { raise: r, delta };
  });

  function resetForm() {
    setEffectiveDate("");
    setBaseSalary("");
    setAllowance("");
    setReason("");
    setError("");
    setAdding(false);
  }

  function handleAdd() {
    const base = Number(baseSalary.replace(/[^\d]/g, ""));
    if (!effectiveDate) return setError("Vui lòng chọn ngày được tăng.");
    if (!base || base <= 0) return setError("Vui lòng nhập mức lương cơ bản mới.");
    if (!reason.trim()) return setError("Vui lòng nhập lý do tăng lương.");
    const allow = allowance.trim() ? Number(allowance.replace(/[^\d]/g, "")) : null;
    addRaise({ employeeCode, effectiveDate, baseSalary: base, allowance: allow, reason: reason.trim() });
    resetForm();
    reload();
    onChanged();
  }

  function handleDelete(id: string) {
    deleteRaise(employeeCode, id);
    reload();
    onChanged();
  }

  return (
    <div className="mt-6 border-t border-[var(--color-border-light)] pt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
          <TrendingUp size={15} className="text-[var(--color-accent)]" /> Lịch sử tăng lương
        </div>
        {canEdit && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Plus size={13} /> Ghi nhận tăng lương
          </button>
        )}
      </div>

      <div className="mb-3 rounded-[8px] bg-[var(--color-page-bg)] px-3 py-2 text-[11.5px] text-[var(--color-text-muted)]">
        Khi tính lương, hệ thống chỉ dùng mức lương của <strong>lần điều chỉnh mới nhất</strong>.
      </div>

      {canEdit && adding && (
        <div className="mb-4 rounded-[10px] border border-[var(--color-border)] bg-white p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--color-text-muted)]">
              Ngày được tăng
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--color-text-muted)]">
              Lương cơ bản mới
              <input
                inputMode="numeric"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="VD: 15000000"
                className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--color-text-muted)]">
              Phụ cấp mới (tuỳ chọn)
              <input
                inputMode="numeric"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                placeholder="Bỏ trống nếu giữ nguyên"
                className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--color-text-muted)]">
              Lý do tăng
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Tăng lương định kỳ 2026"
                className="h-9 rounded-[8px] border border-[var(--color-border)] px-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
          </div>
          {error && <div className="mt-2 text-[12px] text-[var(--color-danger)]">{error}</div>}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
            >
              <Save size={13} /> Lưu
            </button>
            <button
              onClick={resetForm}
              className="rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-[12.5px] text-[var(--color-text-muted)]">
          Chưa có lịch sử tăng lương. Lương hiện tại: {formatMoney(currentBase)}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-[var(--color-border)]">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-[var(--color-page-bg)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                <th className="px-3 py-2.5 font-medium">Ngày tăng</th>
                <th className="px-3 py-2.5 text-right font-medium">Lương cơ bản</th>
                <th className="px-3 py-2.5 text-right font-medium">Mức tăng</th>
                <th className="px-3 py-2.5 text-right font-medium">Phụ cấp</th>
                <th className="px-3 py-2.5 font-medium">Lý do</th>
                {canEdit && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ raise, delta }, i) => (
                <tr key={raise.id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatDate(raise.effectiveDate)}
                    {i === 0 && (
                      <span className="ml-1.5 rounded-[6px] bg-[var(--color-success-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
                        Đang áp dụng
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-medium">{formatMoney(raise.baseSalary)}</td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                    {delta == null ? (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-lighter)]">Khởi điểm</span>
                    ) : delta === 0 ? (
                      <span className="text-[var(--color-text-lighter)]">—</span>
                    ) : (
                      <span className={cn("inline-flex items-center gap-0.5", delta > 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                        {delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        {formatMoney(Math.abs(delta))}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                    {raise.allowance != null ? formatMoney(raise.allowance) : <span className="text-[var(--color-text-lighter)]">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{raise.reason}</td>
                  {canEdit && (
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(raise.id)}
                        title="Xoá bản ghi"
                        className="rounded p-1 text-[var(--color-text-lighter)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const deptFetcher = useCallback(() => fetchDepartments(), []);
  const { data: deptData } = useQuery(deptFetcher);
  const deptOptions = useMemo(
    () => (deptData?.data ?? []).map((d: ApiDepartment) => d.name),
    [deptData],
  );
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableFields | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customVals, setCustomVals] = useState<Record<string, string>>({});
  const [customSaved, setCustomSaved] = useState(false);
  const empIdNum = data?.employee?.id;
  useEffect(() => {
    hydrateCustomData(true).then(() => {
      setCustomFields(getCustomFields());
      if (empIdNum != null) setCustomVals(getCustomValues(empIdNum));
    });
  }, [empIdNum]);

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

  const currentPhoto = photoDraft ?? photoUrl ?? employee.photo_url ?? getEmployeePhoto(employee.id);

  const kpiScore = seededRandom(employee.name + "kpi", 65, 98);
  const kpiRank = kpiScore >= 90 ? "Tốt" : kpiScore >= 70 ? "Khá" : kpiScore >= 50 ? "TB" : "Yếu";

  function startEditing() {
    if (!employee) return;
    setForm({
      code: employee.code ?? "",
      name: employee.name ?? "",
      gender: employee.gender ?? "",
      dob: employee.dob ?? "",
      phone: employee.phone ?? "",
      cccd: employee.cccd ?? "",
      address: employee.address ?? "",
      email: employee.email ?? "",
      department_name: employee.department_name ?? "",
      position: employee.position ?? "",
      workplace: employee.workplace ?? "",
      contract_type: employee.contract_type ?? "",
      contract_end: employee.contract_end ?? "",
      join_date: employee.join_date ?? "",
      resign_date: employee.resign_date ?? "",
      level: employee.level ?? "",
      manager: employee.manager ?? "",
      status: employee.status ?? "",
      bank: employee.bank ?? "",
      tax_code: employee.tax_code ?? "",
      ins_status: insurance?.status ?? "",
      ins_code: insurance?.ins_code ?? "",
      bhxh_book: insurance?.bhxh_book ?? "",
      bhyt_code: insurance?.bhyt_code ?? "",
      bhyt_clinic: insurance?.bhyt_clinic ?? "",
      ins_start_date: insurance?.start_date ?? "",
      ins_salary_base: insurance?.salary_base ? String(insurance.salary_base) : "",
      base_salary: compensation?.base_salary ? String(compensation.base_salary) : "",
      allowance: compensation?.allowance ? String(compensation.allowance) : "",
      dependents: compensation?.dependents != null ? String(compensation.dependents) : "0",
    });
    setEditing(true);
    setSaveSuccess(false);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
    setSaveSuccess(false);
  }

  async function handleSave() {
    if (!form || !employeeId) return;
    const toNumber = (v: string) => {
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    const payload = {
      code: form.code,
      name: form.name,
      gender: form.gender,
      dob: form.dob,
      phone: form.phone,
      cccd: form.cccd,
      address: form.address,
      email: form.email,
      departmentName: form.department_name,
      position: form.position,
      workplace: form.workplace,
      contractType: form.contract_type,
      contractEnd: form.contract_end,
      joinDate: form.join_date,
      resignDate: form.resign_date,
      status: form.status,
      manager: form.manager,
      level: form.level,
      bank: form.bank,
      taxCode: form.tax_code,
      compensation: {
        baseSalary: toNumber(form.base_salary),
        allowance: toNumber(form.allowance),
        dependents: toNumber(form.dependents),
      },
      insurance: {
        status: form.ins_status,
        insCode: form.ins_code,
        bhxhBook: form.bhxh_book,
        bhytCode: form.bhyt_code,
        bhytClinic: form.bhyt_clinic,
        startDate: form.ins_start_date,
        salaryBase: toNumber(form.ins_salary_base),
      },
    };
    try {
      await doUpdate(employeeId, payload);
      setEditing(false);
      setForm(null);
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

  async function savePhoto() {
    if (!photoDraft || !employee || !employeeId) return;
    const draft = photoDraft;
    // Cache cục bộ: hiển thị tức thì trên máy này + dự phòng khi chạy demo/offline.
    setEmployeePhoto(employee.id, draft);
    setPhotoUrl(draft);
    setPhotoDraft(null);
    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 3000);
    // Ưu tiên R2: upload ảnh, server lưu file + cập nhật photo_url = URL công khai.
    try {
      const { url } = await uploadEmployeeAvatar(employeeId, draft);
      setPhotoUrl(url);
      setEmployeePhoto(employee.id, url); // cache URL thay cho base64
      refetch();
    } catch {
      // R2 chưa bật / lỗi → fallback: lưu base64 vào D1 như trước (không hỏng avatar).
      try {
        await updateEmployee(employeeId, { photoUrl: draft });
        refetch();
      } catch {
        /* Offline — vẫn giữ ảnh trong localStorage làm dự phòng. */
      }
    }
  }

  function cancelPhoto() {
    setPhotoDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveCustom() {
    if (empIdNum == null) return;
    await setCustomValues(empIdNum, customVals);
    setCustomSaved(true);
    setTimeout(() => setCustomSaved(false), 3000);
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
      const raw = reader.result as string;
      // Thu nhỏ ảnh về cỡ avatar (tối đa 320px, JPEG) để base64 gọn — lưu
      // xuống D1/localStorage nhẹ và tải nhanh trên mọi máy.
      const img = new Image();
      img.onload = () => {
        const MAX = 320;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPhotoDraft(canvas.toDataURL("image/jpeg", 0.85));
        } else {
          setPhotoDraft(raw);
        }
      };
      img.onerror = () => setPhotoDraft(raw);
      img.src = raw;
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
            {canEdit && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                >
                  <Upload size={12} /> {currentPhoto ? "Thay ảnh" : "Tải ảnh"}
                </button>
                <button
                  onClick={savePhoto}
                  disabled={!photoDraft}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                    photoDraft
                      ? "bg-[var(--color-success)] text-white hover:opacity-90"
                      : "cursor-not-allowed bg-[var(--color-page-bg)] text-[var(--color-text-lighter)]",
                  )}
                  title={photoDraft ? "Lưu ảnh mới" : "Chọn ảnh mới trước khi lưu"}
                >
                  <Save size={12} /> Lưu ảnh
                </button>
                {photoDraft && (
                  <button
                    onClick={cancelPhoto}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[11.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                  >
                    <X size={12} /> Huỷ
                  </button>
                )}
                {photoDraft && <span className="text-[11px] text-[var(--color-warning)]">● Ảnh mới chưa lưu</span>}
                {photoSaved && <span className="text-[11px] font-medium text-[var(--color-success)]">Đã lưu ảnh ✓</span>}
              </div>
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
            {(customFields.length > 0 ? [...TABS, "Cột tùy chỉnh"] : TABS).map((t, i) => (
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
                <Field label="Mã thẻ" value={employee.code} editing={editing} field="code" form={form!} onChange={handleFieldChange} />
                <Field label="Họ và tên" value={employee.name} editing={editing} field="name" form={form!} onChange={handleFieldChange} />
                <Field label="Bộ phận" value={employee.department_name} editing={editing} field="department_name" form={form!} onChange={handleFieldChange} type="select" options={deptOptions} />
                <Field label="Chức vụ" value={employee.position} editing={editing} field="position" form={form!} onChange={handleFieldChange} />
                <Field label="Ngày vào làm" value={formatDate(employee.join_date)} editing={editing} field="join_date" form={form!} onChange={handleFieldChange} type="date" />
                <Field label="Trạng thái" value={employee.status} editing={editing} field="status" form={form!} onChange={handleFieldChange} type="select" options={["Đang làm việc", "Nghỉ việc", "Nghỉ thai sản", "Thử việc"]} />
                <Field label="Nơi làm việc" value={employee.workplace} editing={editing} field="workplace" form={form!} onChange={handleFieldChange} />
                <Field label="Cấp bậc" value={employee.level} editing={editing} field="level" form={form!} onChange={handleFieldChange} />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Bộ phận" value={employee.department_name} editing={editing} field="department_name" form={form!} onChange={handleFieldChange} type="select" options={deptOptions} />
              <Field label="Chức vụ" value={employee.position} editing={editing} field="position" form={form!} onChange={handleFieldChange} />
              <Field label="Cấp bậc" value={employee.level} editing={editing} field="level" form={form!} onChange={handleFieldChange} />
              <Field label="Ngày vào làm" value={formatDate(employee.join_date)} editing={editing} field="join_date" form={form!} onChange={handleFieldChange} type="date" />
              <Field label="Quản lý trực tiếp" value={employee.manager} editing={editing} field="manager" form={form!} onChange={handleFieldChange} />
              <Field label="Nơi làm việc" value={employee.workplace} editing={editing} field="workplace" form={form!} onChange={handleFieldChange} />
              <Field label="Loại hợp đồng" value={employee.contract_type ?? "Không xác định"} editing={editing} field="contract_type" form={form!} onChange={handleFieldChange} type="select" options={["Không xác định thời hạn", "Xác định thời hạn", "Thử việc", "Thời vụ"]} />
              {(editing || employee.contract_end) && (
                <Field label="Ngày hết hạn HĐ" value={formatDate(employee.contract_end)} editing={editing} field="contract_end" form={form!} onChange={handleFieldChange} type="date" />
              )}
              <Field label="Ngày nghỉ việc" value={formatDate(employee.resign_date)} editing={editing} field="resign_date" form={form!} onChange={handleFieldChange} type="date" />
              {employee.contract_date_1 && <ReadOnlyField label="Ngày HĐLĐ L1" value={employee.contract_date_1} />}
              {employee.contract_date_2 && <ReadOnlyField label="Ngày HĐLĐ L2" value={employee.contract_date_2} />}
              {employee.contract_date_3 && <ReadOnlyField label="Ngày HĐLĐ L3" value={employee.contract_date_3} />}
              {employee.resign_reason && <ReadOnlyField label="Nguyên nhân nghỉ" value={employee.resign_reason} />}
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Ngày sinh" value={formatDate(employee.dob)} editing={editing} field="dob" form={form!} onChange={handleFieldChange} type="date" />
              {employee.birth_year && <ReadOnlyField label="Năm sinh" value={employee.birth_year} />}
              <Field label="Giới tính" value={employee.gender} editing={editing} field="gender" form={form!} onChange={handleFieldChange} type="select" options={["Nam", "Nữ"]} />
              <Field label="CCCD" value={employee.cccd} editing={editing} field="cccd" form={form!} onChange={handleFieldChange} />
              {employee.cccd_issue_date && <ReadOnlyField label="Ngày cấp CCCD" value={employee.cccd_issue_date} />}
              {employee.cccd_issue_place && <ReadOnlyField label="Nơi cấp CCCD" value={employee.cccd_issue_place} />}
              <Field label="Mã số thuế" value={employee.tax_code} editing={editing} field="tax_code" form={form!} onChange={handleFieldChange} />
              <Field label="Điện thoại" value={employee.phone} editing={editing} field="phone" form={form!} onChange={handleFieldChange} />
              <Field label="Email" value={employee.email} editing={editing} field="email" form={form!} onChange={handleFieldChange} />
              <Field label="Địa chỉ thường trú" value={employee.address} editing={editing} field="address" form={form!} onChange={handleFieldChange} />
              {employee.temp_address && <ReadOnlyField label="Địa chỉ tạm trú" value={employee.temp_address} />}
              {employee.birth_place && <ReadOnlyField label="Nơi sinh" value={employee.birth_place} />}
              {employee.education && <ReadOnlyField label="Học lực" value={employee.education} />}
              {employee.nationality && <ReadOnlyField label="Quốc tịch" value={employee.nationality} />}
              {employee.religion && <ReadOnlyField label="Tôn giáo" value={employee.religion} />}
              {employee.ethnicity && <ReadOnlyField label="Dân tộc" value={employee.ethnicity} />}
              <Field label="Số phụ thuộc" value={compensation?.dependents ?? 0} editing={editing} field="dependents" form={form!} onChange={handleFieldChange} />
              {employee.relative_name && <ReadOnlyField label="Người thân" value={employee.relative_name} />}
              {employee.relative_relation && <ReadOnlyField label="Mối quan hệ" value={employee.relative_relation} />}
              {employee.relative_phone && <ReadOnlyField label="SĐT người thân" value={employee.relative_phone} />}
            </div>
          )}

          {tab === 3 && (
            <>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Lương cơ bản hiện tại" value={compensation?.base_salary ? formatMoney(compensation.base_salary) : "-"} editing={editing} field="base_salary" form={form!} onChange={handleFieldChange} />
                <Field label="Phụ cấp" value={compensation?.allowance ? formatMoney(compensation.allowance) : "-"} editing={editing} field="allowance" form={form!} onChange={handleFieldChange} />
                <Field label="Tài khoản ngân hàng" value={employee.bank} editing={editing} field="bank" form={form!} onChange={handleFieldChange} />
                {employee.bank_account && <ReadOnlyField label="Số tài khoản" value={employee.bank_account} />}
                {employee.bank_branch && <ReadOnlyField label="Chi nhánh ngân hàng" value={employee.bank_branch} />}
              </div>
              {!editing && (
                <SalaryHistorySection
                  employeeCode={employee.code}
                  currentBase={compensation?.base_salary ?? 0}
                  canEdit={canEdit}
                  onChanged={refetch}
                />
              )}
            </>
          )}

          {tab === 4 && (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Tình trạng BHXH" value={insurance?.status ?? "Chưa tham gia"} editing={editing} field="ins_status" form={form!} onChange={handleFieldChange} type="select" options={["Đã tham gia", "Chưa tham gia", "Tạm dừng"]} />
              <Field label="Mã BHXH" value={insurance?.ins_code} editing={editing} field="ins_code" form={form!} onChange={handleFieldChange} />
              <Field label="Sổ BHXH" value={insurance?.bhxh_book} editing={editing} field="bhxh_book" form={form!} onChange={handleFieldChange} />
              <Field label="Mã thẻ BHYT" value={insurance?.bhyt_code} editing={editing} field="bhyt_code" form={form!} onChange={handleFieldChange} />
              <Field label="Nơi khám BHYT" value={insurance?.bhyt_clinic} editing={editing} field="bhyt_clinic" form={form!} onChange={handleFieldChange} />
              <Field label="Ngày bắt đầu đóng" value={insurance?.start_date ? formatDate(insurance.start_date) : "-"} editing={editing} field="ins_start_date" form={form!} onChange={handleFieldChange} type="date" />
              <Field label="Mức lương đóng BH" value={insurance?.salary_base ? formatMoney(insurance.salary_base) : "-"} editing={editing} field="ins_salary_base" form={form!} onChange={handleFieldChange} />
              {employee.bhxh_no && <ReadOnlyField label="Mã số sổ BHXH" value={employee.bhxh_no} />}
              {employee.bhxh_increase_date && <ReadOnlyField label="Báo tăng BHXH" value={employee.bhxh_increase_date} />}
              {employee.bhxh_decrease_date && <ReadOnlyField label="Báo giảm BHXH" value={employee.bhxh_decrease_date} />}
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

          {tab === CUSTOM_TAB && customFields.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] text-[var(--color-text-muted)]">
                  Các cột tùy chỉnh do HR tạo thêm. Thêm/ẩn/xóa cột thực hiện ở trang danh sách nhân viên.
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {customSaved && <span className="text-[11px] font-medium text-[var(--color-success)]">Đã lưu ✓</span>}
                    <button
                      onClick={saveCustom}
                      className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-success)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
                    >
                      <Save size={13} /> Lưu
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                {customFields.map((f) => (
                  <div key={f.id}>
                    <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">{f.label}</div>
                    {canEdit ? (
                      f.type === "select" ? (
                        <select
                          value={customVals[f.id] ?? ""}
                          onChange={(e) => setCustomVals((s) => ({ ...s, [f.id]: e.target.value }))}
                          className="mt-1 h-9 w-full rounded-[8px] border border-[var(--color-accent)] bg-white px-2.5 text-[13px] outline-none"
                        >
                          <option value="">--</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                          inputMode={f.type === "number" ? "numeric" : undefined}
                          value={customVals[f.id] ?? ""}
                          onChange={(e) => setCustomVals((s) => ({ ...s, [f.id]: e.target.value }))}
                          className="mt-1 h-9 w-full rounded-[8px] border border-[var(--color-accent)] px-2.5 text-[13px] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        />
                      )
                    ) : (
                      <div className="mt-1 text-[13.5px] text-[var(--color-text-primary)]">
                        {customVals[f.id]
                          ? f.type === "date"
                            ? formatDate(customVals[f.id])
                            : customVals[f.id]
                          : "-"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
