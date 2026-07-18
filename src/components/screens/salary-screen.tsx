"use client";

import { useMemo, useState, useRef } from "react";
import { X, Printer, Download } from "lucide-react";
import { fetchSalary, fetchDepartments, type ApiSalaryRow } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { formatMoney, cn } from "@/lib/utils";
import { useColumnPrefs, type ColumnDef } from "@/lib/table-prefs";
import { ColumnMenu } from "@/components/ui/column-menu";
import { exportStyledExcel } from "@/lib/excel-export";

const STD_DAYS = 26;
const HOURS_PER_DAY = 8;
const PERSONAL_DEDUCTION = 15_500_000;
const DEPENDENT_DEDUCTION = 6_200_000;

const PIT_BRACKETS = [
  { upTo: 10_000_000, rate: 0.05, quick: 0 },
  { upTo: 30_000_000, rate: 0.10, quick: 500_000 },
  { upTo: 60_000_000, rate: 0.20, quick: 3_500_000 },
  { upTo: 100_000_000, rate: 0.30, quick: 9_500_000 },
  { upTo: Infinity, rate: 0.35, quick: 14_500_000 },
];

function computePIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const b of PIT_BRACKETS) {
    if (taxableIncome <= b.upTo) {
      return Math.round(taxableIncome * b.rate - b.quick);
    }
  }
  return 0;
}

export interface SalaryComputed {
  base: number;
  responsibility: number;
  allowance: number;
  gasAllowanceMonth: number;
  attendanceBonus: number;
  totalMonthly: number;
  actualDays: number;
  gasDays: number;
  leaveDays: number;
  otWeekdayHours: number;
  otSundayHours: number;
  otHolidayHours: number;
  otNightHours: number;
  dependents: number;
  workSalary: number;
  responsibilityActual: number;
  allowanceActual: number;
  attendanceActual: number;
  otWeekday: number;
  otWeekdayExempt: number;
  otSunday: number;
  otSundayExempt: number;
  otHoliday: number;
  bonus: number;
  mealAllowance: number;
  gasAllowanceActual: number;
  nightAllowance: number;
  leavePay: number;
  totalIncome: number;
  taxableIncome: number;
  bhxh: number;
  bhyt: number;
  bhtn: number;
  insuranceTotal: number;
  unionDues: number;
  advance: number;
  taxableAfterDeductions: number;
  pit: number;
  netPay: number;
}

function computeSalary(row: ApiSalaryRow): SalaryComputed {
  const base = row.base_salary ?? 0;
  const responsibility = row.responsibility_salary ?? 0;
  const allowance = row.allowance ?? 0;
  const gasAllowanceMonth = row.gas_allowance ?? 0;
  const attendanceBonus = row.attendance_bonus ?? 0;
  const totalMonthly = base + responsibility + allowance + gasAllowanceMonth + attendanceBonus;

  const actualDays = row.actual_days ?? 0;
  const gasDays = row.gas_days ?? 0;
  const leaveDays = row.leave_days ?? 0;
  const otWeekdayHours = row.ot_weekday_hours ?? 0;
  const otSundayHours = row.ot_sunday_hours ?? 0;
  const otHolidayHours = row.ot_holiday_hours ?? 0;
  const otNightHours = row.ot_night_hours ?? 0;
  const dependents = row.dependents ?? 0;

  const dailyBase = base / STD_DAYS;
  const hourlyBase = dailyBase / HOURS_PER_DAY;

  const workSalary = Math.round(dailyBase * actualDays);
  const responsibilityActual = Math.round((responsibility / STD_DAYS) * actualDays);
  const allowanceActual = Math.round((allowance / STD_DAYS) * actualDays);
  const attendanceActual = row.attendance_bonus ?? 0;
  const otWeekday = Math.round(hourlyBase * otWeekdayHours * 1.5);
  const otWeekdayExempt = Math.round(otWeekday / 3);
  const otSunday = Math.round(hourlyBase * otSundayHours * 2.0);
  const otSundayExempt = Math.round(otSunday / 2);
  const otHoliday = Math.round(hourlyBase * otHolidayHours * 3.0);
  const bonus = row.bonus ?? 0;
  const mealAllowance = row.meal_allowance ?? 0;
  const gasAllowanceActual = gasDays > 0 ? Math.round((gasAllowanceMonth / STD_DAYS) * gasDays) : 0;
  const nightAllowance = row.night_allowance ?? 0;
  const leavePay = leaveDays > 0 ? Math.round(dailyBase * leaveDays) : 0;

  const totalIncome = workSalary + responsibilityActual + allowanceActual + attendanceActual
    + otWeekday + otWeekdayExempt + otSunday + otSundayExempt + otHoliday
    + bonus + mealAllowance + gasAllowanceActual + nightAllowance + leavePay;

  const taxableIncome = totalIncome - otSundayExempt - otWeekdayExempt;

  const bhxh = row.bhxh_amount ?? 0;
  const bhyt = row.bhyt_amount ?? 0;
  const bhtn = row.bhtn_amount ?? 0;
  const insuranceTotal = bhxh + bhyt + bhtn;
  const unionDues = row.union_dues ?? 50000;
  const advance = row.advance ?? 0;

  const taxableAfterDeductions = taxableIncome - insuranceTotal - PERSONAL_DEDUCTION - dependents * DEPENDENT_DEDUCTION;
  const pit = computePIT(taxableAfterDeductions);

  const netPay = totalIncome - unionDues - insuranceTotal - advance - pit;

  return {
    base, responsibility, allowance, gasAllowanceMonth, attendanceBonus, totalMonthly,
    actualDays, gasDays, leaveDays, otWeekdayHours, otSundayHours, otHolidayHours, otNightHours, dependents,
    workSalary, responsibilityActual, allowanceActual, attendanceActual,
    otWeekday, otWeekdayExempt, otSunday, otSundayExempt, otHoliday,
    bonus, mealAllowance, gasAllowanceActual, nightAllowance, leavePay,
    totalIncome, taxableIncome,
    bhxh, bhyt, bhtn, insuranceTotal, unionDues, advance,
    taxableAfterDeductions, pit, netPay,
  };
}

type SalaryDisplayRow = { row: ApiSalaryRow; s: SalaryComputed };

function totalOtOf(s: SalaryComputed): number {
  return s.otWeekday + s.otWeekdayExempt + s.otSunday + s.otSundayExempt + s.otHoliday;
}

const SAL_COLUMNS: ColumnDef<SalaryDisplayRow>[] = [
  { id: "name", label: "Nhân viên", locked: true, cell: (d) => d.row.name, exportValue: (d) => `${d.row.name} (${d.row.code})` },
  { id: "department_name", label: "Bộ phận", cell: (d) => d.row.department_name ?? "-", exportValue: (d) => d.row.department_name ?? "" },
  { id: "cong", label: "Công", align: "right", cell: (d) => `${d.s.actualDays}/${STD_DAYS}`, exportValue: (d) => d.s.actualDays, exportFormat: "int" },
  { id: "workSalary", label: "Lương công", align: "right", cell: (d) => formatMoney(d.s.workSalary), exportValue: (d) => d.s.workSalary, exportFormat: "money" },
  { id: "responsibilityActual", label: "Trách nhiệm", align: "right", cell: (d) => formatMoney(d.s.responsibilityActual), exportValue: (d) => d.s.responsibilityActual, exportFormat: "money" },
  { id: "overtime", label: "Tăng ca", align: "right", cell: (d) => (totalOtOf(d.s) > 0 ? formatMoney(totalOtOf(d.s)) : "-"), exportValue: (d) => totalOtOf(d.s), exportFormat: "money" },
  { id: "totalIncome", label: "Tổng TN", align: "right", cell: (d) => formatMoney(d.s.totalIncome), exportValue: (d) => d.s.totalIncome, exportFormat: "money" },
  { id: "insuranceTotal", label: "Bảo hiểm", align: "right", cell: (d) => `-${formatMoney(d.s.insuranceTotal)}`, exportValue: (d) => -d.s.insuranceTotal, exportFormat: "money" },
  { id: "pit", label: "Thuế", align: "right", cell: (d) => (d.s.pit > 0 ? `-${formatMoney(d.s.pit)}` : "0"), exportValue: (d) => -d.s.pit, exportFormat: "money" },
  { id: "advance", label: "Tạm ứng", align: "right", cell: (d) => (d.s.advance > 0 ? `-${formatMoney(d.s.advance)}` : "-"), exportValue: (d) => -d.s.advance, exportFormat: "money" },
  { id: "netPay", label: "Thực nhận", align: "right", cell: (d) => formatMoney(d.s.netPay), exportValue: (d) => d.s.netPay, exportFormat: "money" },
];

function PayslipModal({ data, period, onClose }: { data: SalaryDisplayRow; period: string; onClose: () => void }) {
  const { row, s } = data;
  const [y, m] = period.split("-");
  const periodLabel = `${m}/${y}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-[14px] bg-white p-[20px] max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            Phiếu lương — {row.name}
          </div>
          <button onClick={onClose}><X size={18} className="text-[var(--color-text-lighter)]" /></button>
        </div>
        <div className="mb-3 text-[12px] text-[var(--color-text-muted)]">
          Kỳ {periodLabel} · {row.department_name} · Mã NV: {row.code}
        </div>

        <div className="grid grid-cols-2 gap-4 text-[12.5px]">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-lighter)]">I. Thông tin lương</div>
            <div className="flex flex-col gap-0.5">
              <Row label="Lương cơ bản" value={s.base} />
              <Row label="Trách nhiệm" value={s.responsibility} />
              <Row label="Phụ cấp" value={s.allowance} />
              <Row label="Chuyên cần" value={s.attendanceBonus} />
              <Row label="Hỗ trợ xăng xe" value={s.gasAllowanceMonth} />
              <Row label="Tổng lương" value={s.totalMonthly} bold />
            </div>

            <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-lighter)]">III. Thu nhập trong tháng</div>
            <div className="flex flex-col gap-0.5">
              <Row label="Lương ngày công" value={s.workSalary} />
              <Row label="Trách nhiệm" value={s.responsibilityActual} />
              <Row label="Phụ cấp" value={s.allowanceActual} />
              {s.attendanceActual > 0 && <Row label="Chuyên cần" value={s.attendanceActual} />}
              {(s.otWeekday + s.otWeekdayExempt) > 0 && <Row label="Tăng ca ngày thường" value={s.otWeekday + s.otWeekdayExempt} />}
              {(s.otSunday + s.otSundayExempt) > 0 && <Row label="Tăng ca chủ nhật" value={s.otSunday + s.otSundayExempt} />}
              {s.otHoliday > 0 && <Row label="Tăng ca ngày lễ" value={s.otHoliday} />}
              {s.bonus > 0 && <Row label="Thưởng" value={s.bonus} />}
              {s.mealAllowance > 0 && <Row label="Phụ cấp cơm" value={s.mealAllowance} />}
              {s.gasAllowanceActual > 0 && <Row label="Phụ cấp xăng xe" value={s.gasAllowanceActual} />}
              {s.nightAllowance > 0 && <Row label="Phụ cấp ca đêm" value={s.nightAllowance} />}
              {s.leavePay > 0 && <Row label="Lương phép năm" value={s.leavePay} />}
              <Row label="Tổng cộng (1)" value={s.totalIncome} bold />
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-lighter)]">II. Ngày công</div>
            <div className="flex flex-col gap-0.5">
              <Row label="Ngày làm thực tế" value={s.actualDays} raw />
              {s.otWeekdayHours > 0 && <Row label="Giờ TC ngày thường" value={s.otWeekdayHours} raw />}
              {s.otSundayHours > 0 && <Row label="Giờ TC chủ nhật" value={s.otSundayHours} raw />}
              {s.otHolidayHours > 0 && <Row label="Giờ TC ngày lễ" value={s.otHolidayHours} raw />}
              {s.leaveDays > 0 && <Row label="Phép năm (ngày)" value={s.leaveDays} raw />}
              {s.gasDays > 0 && <Row label="Ngày xăng xe" value={s.gasDays} raw />}
              <Row label="Số người phụ thuộc" value={s.dependents} raw />
            </div>

            <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-lighter)]">IV. Các khoản trừ</div>
            <div className="flex flex-col gap-0.5">
              <Row label="Trừ BHXH (8%)" value={s.bhxh} />
              <Row label="Trừ BHYT (1,5%)" value={s.bhyt} />
              <Row label="Trừ BHTN (1%)" value={s.bhtn} />
              <Row label="Tiền ĐPCĐ" value={s.unionDues} />
              {s.advance > 0 && <Row label="Tạm ứng" value={s.advance} />}
              {s.pit > 0 && <Row label="Thuế TNCN" value={s.pit} />}
              <Row label="Tổng cộng (2)" value={s.insuranceTotal + s.unionDues + s.advance + s.pit} bold />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-[var(--color-success-bg)] px-4 py-3 text-center">
          <span className="text-[12px] text-[var(--color-text-muted)]">THỰC NHẬN = (1) − (2) : </span>
          <span className="text-[16px] font-bold text-[var(--color-success)] font-[family-name:var(--font-mono)]">
            {formatMoney(s.netPay)} đồng
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, raw }: { label: string; value: number; bold?: boolean; raw?: boolean }) {
  return (
    <div className={cn("flex justify-between py-[1px]", bold && "border-t border-[var(--color-border-light)] pt-1 mt-1")}>
      <span className={cn("text-[var(--color-text-muted)]", bold && "font-medium text-[var(--color-text-primary)]")}>{label}</span>
      <span className={cn("font-[family-name:var(--font-mono)]", bold && "font-medium")}>
        {raw ? value : formatMoney(value)}
      </span>
    </div>
  );
}

function PrintPayslips({ rows, period }: { rows: SalaryDisplayRow[]; period: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [y, m] = period.split("-");
  const periodLabel = `${m}/${y}`;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const pages: string[] = [];
    for (let i = 0; i < rows.length; i += 2) {
      const slips = [rows[i], rows[i + 1]].filter(Boolean).map(({ row, s }) => {
        const incomeRows = [
          ["Lương ngày công", s.workSalary],
          ["Trách nhiệm", s.responsibilityActual],
          ["Phụ cấp", s.allowanceActual],
          s.attendanceActual > 0 ? ["Chuyên cần", s.attendanceActual] : null,
          (s.otWeekday + s.otWeekdayExempt) > 0 ? ["Tăng ca ngày thường", s.otWeekday + s.otWeekdayExempt] : null,
          (s.otSunday + s.otSundayExempt) > 0 ? ["Tăng ca chủ nhật", s.otSunday + s.otSundayExempt] : null,
          s.otHoliday > 0 ? ["Tăng ca ngày lễ", s.otHoliday] : null,
          s.bonus > 0 ? ["Thưởng", s.bonus] : null,
          s.mealAllowance > 0 ? ["Phụ cấp cơm", s.mealAllowance] : null,
          s.gasAllowanceActual > 0 ? ["Phụ cấp xăng xe", s.gasAllowanceActual] : null,
          s.nightAllowance > 0 ? ["Phụ cấp ca đêm", s.nightAllowance] : null,
          s.leavePay > 0 ? ["Lương phép năm", s.leavePay] : null,
        ].filter(Boolean) as [string, number][];

        const deductRows = [
          ["Trừ BHXH (8%)", s.bhxh],
          ["Trừ BHYT (1,5%)", s.bhyt],
          ["Trừ BHTN (1%)", s.bhtn],
          ["Tiền ĐPCĐ", s.unionDues],
          s.advance > 0 ? ["Tạm ứng", s.advance] : null,
          s.pit > 0 ? ["Thuế TNCN", s.pit] : null,
        ].filter(Boolean) as [string, number][];

        const workRows = [
          ["Ngày làm thực tế", s.actualDays],
          s.otWeekdayHours > 0 ? ["Giờ TC ngày thường", s.otWeekdayHours] : null,
          s.otSundayHours > 0 ? ["Giờ TC chủ nhật", s.otSundayHours] : null,
          s.otHolidayHours > 0 ? ["Giờ TC ngày lễ", s.otHolidayHours] : null,
          s.leaveDays > 0 ? ["Phép năm (ngày)", s.leaveDays] : null,
          s.gasDays > 0 ? ["Ngày xăng xe", s.gasDays] : null,
          ["Số người phụ thuộc", s.dependents],
        ].filter(Boolean) as [string, number][];

        const salaryRows: [string, number][] = [
          ["Lương cơ bản", s.base],
          ["Trách nhiệm", s.responsibility],
          ["Phụ cấp", s.allowance],
          ["Chuyên cần", s.attendanceBonus],
          ["Hỗ trợ xăng xe", s.gasAllowanceMonth],
        ];

        const fmt = (n: number) => n.toLocaleString("vi-VN");
        const tblRows = (arr: [string, number][], money = true) =>
          arr.map(([l, v]) => `<tr><td class="lbl">${l}</td><td class="val">${money ? fmt(v) : v}</td></tr>`).join("");

        return `<div class="payslip">
  <div class="ps-head">
    <img src="/logo.png" class="logo" alt="logo" />
    <div class="company">CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY</div>
    <div class="title">PHIẾU LƯƠNG &nbsp;•&nbsp; THÁNG ${periodLabel}</div>
  </div>
  <div class="ps-id">
    <div><span class="k">Họ và tên:</span> <b>${row.name}</b></div>
    <div><span class="k">Bộ phận:</span> ${row.department_name ?? ""}</div>
    <div><span class="k">Mã NV:</span> ${row.code}</div>
  </div>
  <div class="cols">
    <div class="col">
      <div class="blk-h">I. Thông tin về lương</div>
      <table class="t">${tblRows(salaryRows)}<tr class="b"><td class="lbl"><b>Tổng lương</b></td><td class="val"><b>${fmt(s.totalMonthly)}</b></td></tr></table>
      <div class="blk-h">III. Tổng thu nhập trong tháng</div>
      <table class="t">${tblRows(incomeRows)}<tr class="b"><td class="lbl"><b>Tổng cộng (1)</b></td><td class="val"><b>${fmt(s.totalIncome)}</b></td></tr></table>
    </div>
    <div class="col">
      <div class="blk-h">II. Thông tin ngày công</div>
      <table class="t">${tblRows(workRows, false)}</table>
      <div class="blk-h">IV. Các khoản trừ</div>
      <table class="t">${tblRows(deductRows)}<tr class="b"><td class="lbl"><b>Tổng cộng (2)</b></td><td class="val"><b>${fmt(s.insuranceTotal + s.unionDues + s.advance + s.pit)}</b></td></tr></table>
    </div>
  </div>
  <div class="foot">
    <div class="net">THỰC NHẬN = (1) − (2) : <span>${fmt(s.netPay)} đồng</span></div>
    <div class="sign"><div>Người lập phiếu<br><span class="sp"></span></div><div>Người nhận<br><span class="sp"></span></div></div>
  </div>
</div>`;
      });

      pages.push(`<div class="page">${slips.join("\n")}</div>`);
    }

    doc.open();
    doc.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Phiếu lương ${periodLabel}</title>
<style>
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;margin:0;color:#111;background:#fff}
.page{width:210mm;height:297mm;overflow:hidden;padding:8mm;display:flex;flex-direction:column;gap:4mm;page-break-after:always}
.page:last-child{page-break-after:auto}
.payslip{height:138.5mm;overflow:hidden;border:1px solid #222;padding:3.5mm 5mm;display:flex;flex-direction:column}
.ps-head{text-align:center;border-bottom:1.5px solid #222;padding-bottom:1.5mm;margin-bottom:1.5mm;position:relative}
.logo{position:absolute;left:0;top:0;height:14mm;width:auto}
.company{font-size:10.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.2px}
.title{font-size:12.5pt;font-weight:bold;margin-top:0.5mm}
.ps-id{display:flex;justify-content:space-between;font-size:10pt;margin-bottom:1.5mm;gap:8px;flex-wrap:wrap}
.ps-id .k{color:#555}
.cols{display:flex;gap:6mm;flex:1}
.col{flex:1}
.blk-h{font-size:9.5pt;font-weight:bold;background:#eef0f2;border-left:3px solid #333;padding:0.8mm 2mm;margin:1.5mm 0 0.8mm}
table.t{width:100%;border-collapse:collapse;font-size:9.5pt}
table.t td{padding:0.35mm 1mm;border-bottom:1px dotted #cfcfcf;line-height:1.25}
td.lbl{text-align:left}
td.val{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
tr.b td{border-top:1px solid #333;border-bottom:none;padding-top:0.8mm}
.foot{margin-top:auto;padding-top:2mm}
.net{padding:1.8mm 3mm;background:#f1f3f5;border:1.2px solid #333;font-size:11pt;font-weight:bold;text-align:right}
.net span{font-size:12.5pt}
.sign{display:flex;justify-content:space-around;text-align:center;font-size:9.5pt;margin-top:1mm;font-style:italic}
.sign .sp{display:block;height:8mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none}}
@page{size:A4 portrait;margin:0}
</style></head><body>${pages.join("\n")}</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 300);
  };

  return (
    <>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--color-page-bg)]"
      >
        <Printer size={14} /> In phiếu lương
      </button>
      <iframe ref={iframeRef} className="hidden" />
    </>
  );
}

export function SalaryScreen() {
  const [period, setPeriod] = useState("2026-06");
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [selected, setSelected] = useState<SalaryDisplayRow | null>(null);

  const { data, isLoading } = useQuery(() => fetchSalary(period), [period]);
  const { data: deptData } = useQuery(() => fetchDepartments(), []);

  const rows = useMemo<SalaryDisplayRow[]>(() => {
    if (!data?.data) return [];
    return data.data
      .filter((r) => !deptFilter || r.department_id === deptFilter)
      .map((row) => ({ row, s: computeSalary(row) }));
  }, [data, deptFilter]);

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const totalIncome = rows.reduce((s, r) => s + r.s.totalIncome, 0);
    const totalNet = rows.reduce((s, r) => s + r.s.netPay, 0);
    const totalIns = rows.reduce((s, r) => s + r.s.insuranceTotal, 0);
    const totalTax = rows.reduce((s, r) => s + r.s.pit, 0);
    return { totalIncome, totalNet, totalIns, totalTax, count: rows.length };
  }, [rows]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  const { hidden, toggle, reset, isVisible } = useColumnPrefs("salary", SAL_COLUMNS);

  async function handleExport() {
    const cols = SAL_COLUMNS.filter((c) => isVisible(c.id) && c.exportValue);
    exportStyledExcel({
      filename: `bang-luong-${period}`,
      title: `BẢNG LƯƠNG KỲ ${periodLabel}`,
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${rows.length} nhân viên`],
      columns: cols.map((c) => ({ label: c.label, align: c.align, format: c.exportFormat })),
      rows: rows.map((d, i) => cols.map((c) => c.exportValue!(d, i)))
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Bảng lương kỳ {periodLabel}</div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          >
            <option value="">Tất cả phòng ban</option>
            {deptData?.data?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ColumnMenu columns={SAL_COLUMNS} hidden={hidden} onToggle={toggle} onReset={reset} />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
          >
            <Download size={14} /> Xuất Excel
          </button>
          <PrintPayslips rows={rows} period={period} />
          <span className="rounded-[20px] bg-[var(--color-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
            {rows.length} nhân viên
          </span>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng thu nhập", value: formatMoney(totals.totalIncome), color: "text-[var(--color-text-primary)]" },
            { label: "Tổng BHXH/YT/TN", value: formatMoney(totals.totalIns), color: "text-[var(--color-danger)]" },
            { label: "Tổng thuế TNCN", value: formatMoney(totals.totalTax), color: "text-[var(--color-danger)]" },
            { label: "Tổng thực nhận", value: formatMoney(totals.totalNet), color: "text-[var(--color-success)]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2.5">
              <div className={cn("text-[15px] font-semibold font-[family-name:var(--font-mono)]", s.color)}>{s.value}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
          <table className="w-full min-w-[1400px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                {SAL_COLUMNS.filter((c) => isVisible(c.id)).map((c) => (
                  <th
                    key={c.id}
                    className={cn("px-3 py-3 font-medium", c.align === "right" && "text-right")}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, s }) => {
                const totalOT = s.otWeekday + s.otWeekdayExempt + s.otSunday + s.otSundayExempt + s.otHoliday;
                return (
                  <tr
                    key={row.code}
                    onClick={() => setSelected({ row, s })}
                    className="cursor-pointer border-t border-[var(--color-border-light)] hover:bg-[var(--color-page-bg)]"
                  >
                    {isVisible("name") && (
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[var(--color-text-primary)]">{row.name}</div>
                        <div className="text-[11px] text-[var(--color-text-lighter)]">{row.code}</div>
                      </td>
                    )}
                    {isVisible("department_name") && (
                      <td className="px-3 py-2.5 text-[12px] text-[var(--color-text-muted)]">{row.department_name}</td>
                    )}
                    {isVisible("cong") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[12px]">
                        {s.actualDays}/{STD_DAYS}
                      </td>
                    )}
                    {isVisible("workSalary") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.workSalary)}</td>
                    )}
                    {isVisible("responsibilityActual") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">{formatMoney(s.responsibilityActual)}</td>
                    )}
                    {isVisible("overtime") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                        {totalOT > 0 ? formatMoney(totalOT) : "-"}
                      </td>
                    )}
                    {isVisible("totalIncome") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-medium">
                        {formatMoney(s.totalIncome)}
                      </td>
                    )}
                    {isVisible("insuranceTotal") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                        -{formatMoney(s.insuranceTotal)}
                      </td>
                    )}
                    {isVisible("pit") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                        {s.pit > 0 ? `-${formatMoney(s.pit)}` : "0"}
                      </td>
                    )}
                    {isVisible("advance") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)]">
                        {s.advance > 0 ? `-${formatMoney(s.advance)}` : "-"}
                      </td>
                    )}
                    {isVisible("netPay") && (
                      <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-success)]">
                        {formatMoney(s.netPay)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && <PayslipModal data={selected} period={period} onClose={() => setSelected(null)} />}
    </div>
  );
}
