"use client";

import { useMemo, useState } from "react";
import {
  Scale,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
  Download,
  Eye,
  X,
} from "lucide-react";
import { cn, formatMoney, seededRandom } from "@/lib/utils";
import { EMPLOYEES } from "@/lib/data/employees";
import { exportStyledExcel } from "@/lib/excel-export";

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

export function PayrollScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "variance">("name");
  const [detailRow, setDetailRow] = useState<PayrollRow | null>(null);
  const [deptFilter, setDeptFilter] = useState("");
  const [showDeptDrop, setShowDeptDrop] = useState(false);

  const data = useMemo(() => generateReconcileData(), []);
  const departments = useMemo(() => [...new Set(data.map((r) => r.department))].sort(), [data]);

  const filtered = useMemo(() => {
    let list = data;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.code.includes(q));
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (deptFilter) {
      list = list.filter((r) => r.department === deptFilter);
    }
    if (sortBy === "variance") {
      list = [...list].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    }
    return list;
  }, [data, search, statusFilter, deptFilter, sortBy]);

  async function handleExport() {
    const sorted = [...filtered].sort(
      (a, b) => a.department.localeCompare(b.department, "vi") || a.code.localeCompare(b.code, "vi"),
    );
    await exportStyledExcel({
      filename: `doi-chieu-payroll-2026-06`,
      title: "ĐỐI CHIẾU PAYROLL — KỲ 06/2026",
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${sorted.length} nhân viên`],
      columns: [
        { label: "Mã NV" },
        { label: "Họ tên" },
        { label: "Bộ phận" },
        { label: "Hệ thống", align: "right", format: "money" },
        { label: "Ngân hàng", align: "right", format: "money" },
        { label: "Chênh lệch", align: "right", format: "money" },
        { label: "Trạng thái" },
        { label: "Mã tham chiếu" },
      ],
      rows: sorted.map((r) => [
        r.code,
        r.name,
        r.department,
        r.systemNet,
        r.bankAmount,
        r.variance,
        STATUS_CONFIG[r.status].label,
        r.bankRef || "-",
      ]),
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
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Đối chiếu Payroll — Kỳ 06/2026
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
              So sánh lương tính toán hệ thống với số thực chi qua ngân hàng
            </div>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Download size={13} />
            Xuất Excel
          </button>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusDrop((v) => !v); setShowDeptDrop(false); }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Filter size={13} />
            {statusFilter ? STATUS_CONFIG[statusFilter as ReconcileStatus].label : "Trạng thái"}
            <ChevronDown size={13} />
          </button>
          {showStatusDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 w-[160px] rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
              <button
                onClick={() => { setStatusFilter(""); setShowStatusDrop(false); }}
                className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", !statusFilter && "font-semibold text-[var(--color-primary)]")}
              >
                Tất cả
              </button>
              {(Object.keys(STATUS_CONFIG) as ReconcileStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowStatusDrop(false); }}
                  className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", statusFilter === s && "font-semibold text-[var(--color-primary)]")}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dept filter */}
        <div className="relative">
          <button
            onClick={() => { setShowDeptDrop((v) => !v); setShowStatusDrop(false); }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            {deptFilter || "Bộ phận"}
            <ChevronDown size={13} />
          </button>
          {showDeptDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-[240px] w-[200px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
              <button
                onClick={() => { setDeptFilter(""); setShowDeptDrop(false); }}
                className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", !deptFilter && "font-semibold text-[var(--color-primary)]")}
              >
                Tất cả
              </button>
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDeptFilter(d); setShowDeptDrop(false); }}
                  className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", deptFilter === d && "font-semibold text-[var(--color-primary)]")}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort toggle */}
        <button
          onClick={() => setSortBy((v) => (v === "name" ? "variance" : "name"))}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
        >
          <ArrowUpDown size={13} />
          {sortBy === "name" ? "Theo tên" : "Theo chênh lệch"}
        </button>
      </div>

      <div className="text-[12px] text-[var(--color-text-muted)]">
        Hiển thị {filtered.length} / {data.length} bản ghi
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <Scale size={32} className="text-[var(--color-text-lighter)]" />
          <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Không có bản ghi phù hợp</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50/60 text-[11px] font-semibold text-[var(--color-text-muted)]">
                <th className="px-4 py-2.5">Mã NV</th>
                <th className="px-4 py-2.5">Họ tên</th>
                <th className="px-4 py-2.5">Bộ phận</th>
                <th className="px-4 py-2.5 text-right">Hệ thống</th>
                <th className="px-4 py-2.5 text-right">Ngân hàng</th>
                <th className="px-4 py-2.5 text-right">Chênh lệch</th>
                <th className="px-4 py-2.5 text-center">Trạng thái</th>
                <th className="px-4 py-2.5 text-center">Ref</th>
                <th className="px-4 py-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const cfg = STATUS_CONFIG[row.status];
                const Icon = cfg.icon;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)] last:border-b-0 transition hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11.5px] text-[var(--color-text-muted)]">{row.code}</td>
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{row.department}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoney(row.systemNet)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.bankAmount > 0 ? formatMoney(row.bankAmount) : "—"}
                    </td>
                    <td className={cn(
                      "px-4 py-2.5 text-right font-mono font-medium",
                      row.variance > 0 && "text-emerald-600",
                      row.variance < 0 && "text-red-600",
                      row.variance === 0 && "text-[var(--color-text-muted)]",
                    )}>
                      {row.variance === 0
                        ? "0 ₫"
                        : `${row.variance > 0 ? "+" : ""}${formatMoney(row.variance)}`}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium", cfg.color)}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-[10.5px] text-[var(--color-text-lighter)]">
                      {row.bankRef || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setDetailRow(row)}
                        className="rounded p-1 text-[var(--color-text-lighter)] transition hover:bg-gray-100 hover:text-[var(--color-primary)]"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
