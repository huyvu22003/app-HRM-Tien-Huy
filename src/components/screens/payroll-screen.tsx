"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  X,
} from "lucide-react";
import { cn, formatMoney, seededRandom } from "@/lib/utils";
import { EMPLOYEES } from "@/lib/data/employees";
import { exportStyledExcel } from "@/lib/excel-export";
import { type ColumnDef } from "@/lib/table-prefs";
import { DataTable } from "@/components/ui/data-table";

type ReconcileStatus = "matched" | "variance" | "missing";

interface PayrollRow {
  id: number;
  code: string;
  name: string;
  department: string;
  systemNet: number;
  bankAmount: number;
  variance: number;
  variancePct: number;
  status: ReconcileStatus;
  bankRef: string;
  bankDate: string;
  note: string | null;
}

const STATUS_CONFIG: Record<ReconcileStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  matched: { label: "Khớp", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  variance: { label: "Chênh lệch", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  missing: { label: "Thiếu", color: "bg-red-100 text-red-700", icon: XCircle },
};

const STD_DAYS = 26;
const HOURS_PER_DAY = 8;
const PERSONAL_DEDUCTION = 15_500_000;
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
    if (taxableIncome <= b.upTo) return Math.round(taxableIncome * b.rate - b.quick);
  }
  return 0;
}

function generateReconcileData(): PayrollRow[] {
  const working = EMPLOYEES.filter((e) => e.status === "Đang làm việc").slice(0, 20);

  return working.map((e, i) => {
    const base = e.baseSalary || 8_000_000;
    const allowance = e.allowance || 300_000;
    const actualDays = seededRandom(`${e.code}-days`, 22, 26);
    const otHours = seededRandom(`${e.code}-ot`, 0, 20);

    const dailyBase = base / STD_DAYS;
    const hourlyBase = dailyBase / HOURS_PER_DAY;
    const workSalary = Math.round(dailyBase * actualDays);
    const allowanceActual = Math.round((allowance / STD_DAYS) * actualDays);
    const otPay = Math.round(hourlyBase * otHours * 1.5);
    const totalIncome = workSalary + allowanceActual + otPay;

    const bhxh = Math.round(base * 0.08);
    const bhyt = Math.round(base * 0.015);
    const bhtn = Math.round(base * 0.01);
    const insTotal = bhxh + bhyt + bhtn;

    const dependents = e.dependents || 0;
    const taxable = totalIncome - insTotal - PERSONAL_DEDUCTION - dependents * 6_200_000;
    const pit = computePIT(taxable);
    const systemNet = totalIncome - insTotal - pit - 50_000;

    const seed = seededRandom(`${e.code}-var`, 0, 100);
    let bankAmount: number;
    let status: ReconcileStatus;
    let note: string | null = null;

    if (seed < 70) {
      bankAmount = systemNet;
      status = "matched";
    } else if (seed < 90) {
      const delta = seededRandom(`${e.code}-delta`, 1, 5) * 100_000;
      const sign = seededRandom(`${e.code}-sign`, 0, 1) === 0 ? 1 : -1;
      bankAmount = systemNet + sign * delta;
      status = "variance";
      note = sign > 0 ? "Phụ cấp bổ sung từ ngân hàng" : "Trừ tạm ứng chưa ghi nhận";
    } else {
      bankAmount = 0;
      status = "missing";
      note = "Chưa nhận được xác nhận từ ngân hàng";
    }

    const variance = bankAmount - systemNet;
    const variancePct = systemNet > 0 ? (variance / systemNet) * 100 : 0;

    const dd = String(seededRandom(`${e.code}-dd`, 1, 5)).padStart(2, "0");
    const bankRef = `VCB-${String(2026)}07${dd}-${String(i + 1).padStart(4, "0")}`;
    const bankDate = status !== "missing" ? `05/07/2026` : "";

    return {
      id: i + 1,
      code: e.code,
      name: e.name,
      department: e.department,
      systemNet,
      bankAmount,
      variance,
      variancePct,
      status,
      bankRef: status !== "missing" ? bankRef : "",
      bankDate,
      note,
    };
  });
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-white p-4">
      <div className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</div>
      <div className={cn("mt-1 text-[20px] font-bold", color)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--color-text-lighter)]">{sub}</div>}
    </div>
  );
}

const PAYROLL_COLUMNS: ColumnDef<PayrollRow>[] = [
  {
    id: "code",
    label: "Mã NV",
    locked: true,
    cell: (r) => <span className="font-mono text-[11.5px] text-[var(--color-text-muted)]">{r.code}</span>,
    exportValue: (r) => r.code,
  },
  {
    id: "name",
    label: "Họ tên",
    cell: (r) => <span className="font-medium text-[var(--color-text-primary)]">{r.name}</span>,
    exportValue: (r) => r.name,
  },
  {
    id: "department",
    label: "Bộ phận",
    cell: (r) => <span className="text-[var(--color-text-secondary)]">{r.department}</span>,
    exportValue: (r) => r.department,
  },
  {
    id: "systemNet",
    label: "Hệ thống",
    align: "right",
    cell: (r) => <span className="font-mono">{formatMoney(r.systemNet)}</span>,
    exportValue: (r) => r.systemNet,
    exportFormat: "money",
  },
  {
    id: "bankAmount",
    label: "Ngân hàng",
    align: "right",
    cell: (r) => <span className="font-mono">{r.bankAmount > 0 ? formatMoney(r.bankAmount) : "—"}</span>,
    exportValue: (r) => r.bankAmount,
    exportFormat: "money",
  },
  {
    id: "variance",
    label: "Chênh lệch",
    align: "right",
    cell: (r) => (
      <span
        className={cn(
          "font-mono font-medium",
          r.variance > 0 && "text-emerald-600",
          r.variance < 0 && "text-red-600",
          r.variance === 0 && "text-[var(--color-text-muted)]",
        )}
      >
        {r.variance === 0 ? "0 ₫" : `${r.variance > 0 ? "+" : ""}${formatMoney(r.variance)}`}
      </span>
    ),
    exportValue: (r) => r.variance,
    exportFormat: "money",
  },
  {
    id: "status",
    label: "Trạng thái",
    align: "center",
    cell: (r) => {
      const cfg = STATUS_CONFIG[r.status];
      const Icon = cfg.icon;
      return (
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium", cfg.color)}>
          <Icon size={11} />
          {cfg.label}
        </span>
      );
    },
    exportValue: (r) => STATUS_CONFIG[r.status].label,
  },
  {
    id: "bankRef",
    label: "Mã tham chiếu",
    align: "center",
    cell: (r) => <span className="font-mono text-[10.5px] text-[var(--color-text-lighter)]">{r.bankRef || "—"}</span>,
    exportValue: (r) => r.bankRef || "-",
  },
];

export function PayrollScreen() {
  const [detailRow, setDetailRow] = useState<PayrollRow | null>(null);

  const data = useMemo(() => generateReconcileData(), []);

  async function handleExport(exportRows: PayrollRow[], exportCols: ColumnDef<PayrollRow>[]) {
    const cols = exportCols.filter((c) => c.exportValue);
    const sorted = [...exportRows].sort(
      (a, b) => a.department.localeCompare(b.department, "vi") || a.code.localeCompare(b.code, "vi"),
    );
    await exportStyledExcel({
      filename: `doi-chieu-payroll-2026-06`,
      title: "ĐỐI CHIẾU PAYROLL — KỲ 06/2026",
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${sorted.length} nhân viên`],
      columns: cols.map((c) => ({ label: c.label, align: c.align, format: c.exportFormat })),
      rows: sorted.map((r, i) => cols.map((c) => c.exportValue!(r, i))),
    });
  }

  const stats = useMemo(() => {
    const matched = data.filter((r) => r.status === "matched").length;
    const withVariance = data.filter((r) => r.status === "variance").length;
    const missing = data.filter((r) => r.status === "missing").length;
    const totalSystem = data.reduce((s, r) => s + r.systemNet, 0);
    const totalBank = data.reduce((s, r) => s + r.bankAmount, 0);
    const totalVariance = totalBank - totalSystem;
    return { matched, withVariance, missing, totalSystem, totalBank, totalVariance };
  }, [data]);

  const matchRate = data.length > 0 ? Math.round((stats.matched / data.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Period header */}
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-4">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          Đối chiếu Payroll — Kỳ 06/2026
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          So sánh lương tính toán hệ thống với số thực chi qua ngân hàng
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tỷ lệ khớp"
          value={`${matchRate}%`}
          sub={`${stats.matched}/${data.length} bản ghi`}
          color={matchRate >= 80 ? "text-emerald-600" : "text-amber-600"}
        />
        <StatCard
          label="Chênh lệch"
          value={String(stats.withVariance)}
          sub="bản ghi có sai khác"
          color="text-amber-600"
        />
        <StatCard
          label="Thiếu xác nhận"
          value={String(stats.missing)}
          sub="chưa có từ ngân hàng"
          color="text-red-600"
        />
        <StatCard
          label="Tổng chênh lệch"
          value={formatMoney(Math.abs(stats.totalVariance))}
          sub={stats.totalVariance >= 0 ? "Ngân hàng chi nhiều hơn" : "Hệ thống tính nhiều hơn"}
          color={stats.totalVariance === 0 ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      <DataTable<PayrollRow>
        tableKey="payroll"
        columns={PAYROLL_COLUMNS}
        rows={data}
        getRowKey={(r) => r.id}
        onRowClick={(r) => setDetailRow(r)}
        minWidth={1000}
        emptyText="Không có bản ghi phù hợp."
        toolbarLeft={
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Bấm vào dòng để xem chi tiết đối chiếu
          </span>
        }
        toolbarActions={({ rows: fr, columns: fc }) => (
          <button
            onClick={() => handleExport(fr, fc)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Download size={13} />
            Xuất Excel
          </button>
        )}
      />

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 rounded-[12px] border border-[var(--color-border)] bg-gray-50/60 px-4 py-3 text-[11.5px]">
        <div>
          <span className="text-[var(--color-text-muted)]">Tổng hệ thống: </span>
          <span className="font-semibold text-[var(--color-text-primary)]">{formatMoney(stats.totalSystem)}</span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">Tổng ngân hàng: </span>
          <span className="font-semibold text-[var(--color-text-primary)]">{formatMoney(stats.totalBank)}</span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">Chênh lệch: </span>
          <span className={cn("font-semibold", stats.totalVariance === 0 ? "text-emerald-600" : "text-amber-600")}>
            {stats.totalVariance >= 0 ? "+" : ""}{formatMoney(stats.totalVariance)}
          </span>
        </div>
      </div>

      {/* Detail modal */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDetailRow(null)}>
          <div className="relative mx-4 w-full max-w-[480px] rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDetailRow(null)} className="absolute right-4 top-4 rounded p-1 text-[var(--color-text-lighter)] hover:bg-gray-100">
              <X size={16} />
            </button>
            <div className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
              Chi tiết đối chiếu — {detailRow.name}
            </div>

            <div className="flex flex-col gap-3 text-[12.5px]">
              <DetailLine label="Mã NV" value={detailRow.code} />
              <DetailLine label="Bộ phận" value={detailRow.department} />
              <div className="h-px bg-[var(--color-border)]" />
              <DetailLine label="Lương hệ thống" value={formatMoney(detailRow.systemNet)} bold />
              <DetailLine label="Thực chi ngân hàng" value={detailRow.bankAmount > 0 ? formatMoney(detailRow.bankAmount) : "Chưa có"} bold />
              <DetailLine
                label="Chênh lệch"
                value={detailRow.variance === 0 ? "0 ₫" : `${detailRow.variance > 0 ? "+" : ""}${formatMoney(detailRow.variance)} (${detailRow.variancePct.toFixed(1)}%)`}
                color={detailRow.variance > 0 ? "text-emerald-600" : detailRow.variance < 0 ? "text-red-600" : "text-[var(--color-text-muted)]"}
              />
              <div className="h-px bg-[var(--color-border)]" />
              <DetailLine label="Mã GD ngân hàng" value={detailRow.bankRef || "—"} />
              <DetailLine label="Ngày chuyển khoản" value={detailRow.bankDate || "—"} />
              {detailRow.note && (
                <>
                  <div className="h-px bg-[var(--color-border)]" />
                  <div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">Ghi chú</div>
                    <div className="mt-0.5 rounded bg-amber-50 px-2 py-1 text-[12px] text-amber-700">{detailRow.note}</div>
                  </div>
                </>
              )}

              {detailRow.status !== "matched" && (
                <div className={cn("mt-2 rounded-lg px-3 py-2 text-[11.5px]", STATUS_CONFIG[detailRow.status].color)}>
                  {detailRow.status === "variance"
                    ? "Cần kiểm tra lại số liệu tạm ứng và phụ cấp bổ sung."
                    : "Liên hệ ngân hàng để xác nhận trạng thái chuyển khoản."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailLine({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={cn(bold && "font-semibold", color || "text-[var(--color-text-primary)]")}>{value}</span>
    </div>
  );
}
