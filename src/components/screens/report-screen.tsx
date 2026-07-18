"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  ChevronDown,
  Send,
  Filter,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  fetchDailyReports,
  createDailyReport,
  verifyDailyReport,
  type ApiDailyReport,
} from "@/lib/api";
import { useQuery, useMutation } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { exportStyledExcel } from "@/lib/excel-export";
import { useAuth } from "@/lib/auth-context";
import { DEPARTMENTS } from "@/lib/data/departments";

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function statusChip(status: string) {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 size={12} /> Đã xác nhận
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <XCircle size={12} /> Từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <Clock size={12} /> Chờ xác nhận
        </span>
      );
  }
}

interface FormState {
  content: string;
  quantity: string;
  ng_count: string;
  note: string;
}

const EMPTY_FORM: FormState = { content: "", quantity: "", ng_count: "0", note: "" };

export function ReportScreen() {
  const { user } = useAuth();
  const canVerify = user?.role === "super" || user?.role === "hr" || user?.role === "lead";
  const isStaff = user?.role === "staff";

  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeptDrop, setShowDeptDrop] = useState(false);

  const { data, isLoading, refetch } = useQuery(
    () => fetchDailyReports(selectedDate),
    [selectedDate],
  );

  const reports: ApiDailyReport[] = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    let list = reports;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q),
      );
    }
    if (deptFilter) {
      list = list.filter((r) => r.department_name === deptFilter);
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [reports, search, deptFilter, statusFilter]);

  const statusLabel = (s: string) =>
    s === "verified" ? "Đã xác nhận" : s === "rejected" ? "Từ chối" : "Chờ duyệt";

  async function handleExport() {
    const sorted = [...filtered].sort(
      (a, b) => (a.department_name ?? "").localeCompare(b.department_name ?? "", "vi") || a.employee_code.localeCompare(b.employee_code, "vi"),
    );
    await exportStyledExcel({
      filename: `bao-cao-ngay-${selectedDate}`,
      title: `BÁO CÁO SẢN LƯỢNG NGÀY ${selectedDate.split("-").reverse().join("/")}`,
      meta: [`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, `Số lượng: ${sorted.length} báo cáo`],
      columns: [
        { label: "Mã NV" },
        { label: "Họ và tên" },
        { label: "Bộ phận" },
        { label: "Nội dung công việc", width: 320 },
        { label: "Số lượng", align: "right", format: "int" },
        { label: "NG", align: "right", format: "int" },
        { label: "Trạng thái" },
      ],
      rows: sorted.map((r) => [
        r.employee_code,
        r.employee_name,
        r.department_name ?? "-",
        r.content,
        r.quantity,
        r.ng_count,
        statusLabel(r.status),
      ]),
    });
  }

  const stats = useMemo(() => {
    const total = reports.length;
    const verified = reports.filter((r) => r.status === "verified").length;
    const pending = reports.filter((r) => r.status === "pending").length;
    const rejected = reports.filter((r) => r.status === "rejected").length;
    const totalQty = reports.reduce((s, r) => s + r.quantity, 0);
    const totalNg = reports.reduce((s, r) => s + r.ng_count, 0);
    return { total, verified, pending, rejected, totalQty, totalNg };
  }, [reports]);

  const submitMut = useMutation(
    (data: { date: string; content: string; quantity: number; ng_count: number; note: string }) =>
      createDailyReport(data),
  );

  const verifyMut = useMutation(
    (data: { id: number; action: "verify" | "reject"; note?: string }) =>
      verifyDailyReport(data.id, { action: data.action, note: data.note }),
  );

  const handleSubmit = useCallback(async () => {
    if (!form.content.trim()) return;
    try {
      await submitMut.mutate({
        date: selectedDate,
        content: form.content.trim(),
        quantity: Number(form.quantity) || 0,
        ng_count: Number(form.ng_count) || 0,
        note: form.note.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
    } catch {
      // error shown via submitMut.error
    }
  }, [form, selectedDate, submitMut, refetch]);

  const handleVerify = useCallback(
    async (id: number, action: "verify" | "reject") => {
      try {
        await verifyMut.mutate({ id, action });
        refetch();
      } catch {
        // error shown via verifyMut.error
      }
    },
    [verifyMut, refetch],
  );

  const deptNames = useMemo(
    () => DEPARTMENTS.map((d) => d.name).sort((a, b) => a.localeCompare(b, "vi")),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] font-medium text-[var(--color-text-secondary)]">Ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {isStaff && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:opacity-90"
          >
            <Plus size={14} /> Gửi báo cáo
          </button>
        )}
        {!isStaff && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:opacity-90"
          >
            <Plus size={14} /> Gửi báo cáo
          </button>
        )}
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="rounded-[14px] border border-[var(--color-primary)]/30 bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Báo cáo công việc — {displayDate(selectedDate)}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                Nội dung công việc <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
                placeholder="Mô tả công việc đã thực hiện trong ca..."
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[12.5px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-lighter)] focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Số lượng hoàn thành
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Lỗi / NG
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.ng_count}
                  onChange={(e) => setForm((f) => ({ ...f, ng_count: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú thêm..."
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={submitMut.isLoading || !form.content.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-[12.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Send size={13} /> {submitMut.isLoading ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)] transition hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Tổng báo cáo" value={stats.total} color="var(--color-primary)" />
        <StatCard label="Đã xác nhận" value={stats.verified} color="var(--color-success)" />
        <StatCard label="Chờ xác nhận" value={stats.pending} color="var(--color-warning)" />
        <StatCard label="Từ chối" value={stats.rejected} color="var(--color-danger)" />
        <StatCard label="Tổng SL" value={stats.totalQty} color="var(--color-accent)" />
        <StatCard label="Tổng NG" value={stats.totalNg} color={stats.totalNg > 0 ? "var(--color-danger)" : "var(--color-text-lighter)"} />
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

        {/* Dept filter */}
        <div className="relative">
          <button
            onClick={() => setShowDeptDrop((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Filter size={13} />
            {deptFilter || "Bộ phận"}
            <ChevronDown size={13} />
          </button>
          {showDeptDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-[240px] w-[220px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
              <button
                onClick={() => { setDeptFilter(""); setShowDeptDrop(false); }}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50",
                  !deptFilter && "font-semibold text-[var(--color-primary)]",
                )}
              >
                Tất cả
              </button>
              {deptNames.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDeptFilter(d); setShowDeptDrop(false); }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50",
                    deptFilter === d && "font-semibold text-[var(--color-primary)]",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white p-0.5">
          {[
            { val: "", label: "Tất cả" },
            { val: "pending", label: "Chờ" },
            { val: "verified", label: "Đã XN" },
            { val: "rejected", label: "Từ chối" },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setStatusFilter(opt.val)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
                statusFilter === opt.val
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-gray-100",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
        >
          <Download size={13} /> Xuất Excel
        </button>
      </div>

      {/* Count */}
      <div className="text-[12px] text-[var(--color-text-muted)]">
        Hiển thị {filtered.length} / {reports.length} báo cáo
      </div>

      {/* Report list */}
      {isLoading ? (
        <div className="py-12 text-center text-[13px] text-[var(--color-text-light)]">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <ClipboardCheck size={32} className="text-[var(--color-text-lighter)]" />
          <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            {reports.length === 0 ? "Chưa có báo cáo ngày" : "Không tìm thấy kết quả"}
          </div>
          <div className="text-[12px] text-[var(--color-text-light)]">
            {reports.length === 0
              ? `Ngày ${displayDate(selectedDate)} chưa có báo cáo nào`
              : "Thử thay đổi bộ lọc"}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} canVerify={canVerify} onVerify={handleVerify} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report: r,
  canVerify,
  onVerify,
}: {
  report: ApiDailyReport;
  canVerify: boolean;
  onVerify: (id: number, action: "verify" | "reject") => void;
}) {
  const ngRate = r.quantity > 0 ? ((r.ng_count / r.quantity) * 100).toFixed(1) : "0.0";
  const hasNg = r.ng_count > 0;

  return (
    <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-primary)]/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              {r.employee_name}
            </span>
            <span className="text-[11px] text-[var(--color-text-light)]">{r.employee_code}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] text-[var(--color-text-muted)]">
              {r.department_name}
            </span>
          </div>
          <p className="mb-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {r.content}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12px] text-[var(--color-text-muted)]">
              SL: <strong className="text-[var(--color-text-primary)]">{r.quantity}</strong>
            </span>
            <span className={cn("text-[12px]", hasNg ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]")}>
              NG: <strong>{r.ng_count}</strong>
              {hasNg && (
                <span className="ml-1 text-[11px]">
                  ({ngRate}%)
                  {Number(ngRate) > 5 && <AlertTriangle size={11} className="ml-0.5 inline" />}
                </span>
              )}
            </span>
            {r.note && (
              <span className="text-[12px] italic text-[var(--color-text-light)]">&ldquo;{r.note}&rdquo;</span>
            )}
            <span className="text-[11px] text-[var(--color-text-lighter)]">
              {r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {statusChip(r.status)}
          {canVerify && r.status === "pending" && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onVerify(r.id, "verify")}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700"
              >
                <CheckCircle2 size={12} /> Xác nhận
              </button>
              <button
                onClick={() => onVerify(r.id, "reject")}
                className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-red-600"
              >
                <XCircle size={12} /> Từ chối
              </button>
            </div>
          )}
          {r.verified_by_name && (
            <span className="text-[10.5px] text-[var(--color-text-lighter)]">
              {r.status === "verified" ? "XN:" : "TC:"} {r.verified_by_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-white p-3">
      <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-[18px] font-bold" style={{ color }}>
        {value.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}
