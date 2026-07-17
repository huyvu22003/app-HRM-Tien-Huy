"use client";

import { useMemo, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  Search,
  Filter,
} from "lucide-react";
import {
  fetchKpi,
  updateKpi as apiUpdateKpi,
  signKpi as apiSignKpi,
  type ApiKpi,
} from "@/lib/api";
import { useQuery, useMutation } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { DEPARTMENTS } from "@/lib/data/departments";

function kpiClass(score: number) {
  if (score >= 93) return "Xuất sắc";
  if (score >= 90) return "Tốt";
  if (score >= 83) return "Khá";
  if (score >= 70) return "Đạt";
  return "Cần cải thiện";
}

function classColor(rank: string) {
  switch (rank) {
    case "Xuất sắc": return "bg-emerald-100 text-emerald-700";
    case "Tốt": return "bg-blue-100 text-blue-700";
    case "Khá": return "bg-amber-100 text-amber-700";
    case "Đạt": return "bg-gray-100 text-gray-600";
    default: return "bg-red-100 text-red-700";
  }
}

function scoreColor(score: number) {
  if (score >= 90) return "text-[var(--color-success)]";
  if (score >= 83) return "text-[var(--color-accent)]";
  if (score >= 70) return "text-[var(--color-warning)]";
  return "text-[var(--color-danger)]";
}

interface EditState {
  id: number;
  dg: number;
  note: string;
}

export function KpiScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("2026-06");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showDeptDrop, setShowDeptDrop] = useState(false);
  const [tab, setTab] = useState<"table" | "chart">("table");

  const { data, isLoading, refetch } = useQuery(() => fetchKpi(period), [period]);

  const { mutate: doUpdate, isLoading: saving } = useMutation(
    (id: number, body: { dg?: number; note?: string }) => apiUpdateKpi(id, body),
  );

  const { mutate: doSign } = useMutation(
    (id: number, level: 1 | 2) => apiSignKpi(id, level),
  );

  const rows = useMemo(() => {
    if (!data?.data) return [];
    let list = [...data.data].sort((a, b) => b.score - a.score);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.employee_name.toLowerCase().includes(q) || r.employee_code.toLowerCase().includes(q),
      );
    }
    if (deptFilter) {
      list = list.filter((r) => r.department_name === deptFilter);
    }
    return list.map((r, i) => ({ ...r, computedRank: i + 1 }));
  }, [data, search, deptFilter]);

  const allRows = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);

  const stats = useMemo(() => {
    if (!allRows.length) return null;
    const total = allRows.length;
    const avg = Math.round((allRows.reduce((s, r) => s + r.score, 0) / total) * 10) / 10;
    const excellent = allRows.filter((r) => r.score >= 93).length;
    const good = allRows.filter((r) => r.score >= 90 && r.score < 93).length;
    const fair = allRows.filter((r) => r.score >= 83 && r.score < 90).length;
    const pass = allRows.filter((r) => r.score >= 70 && r.score < 83).length;
    const low = allRows.filter((r) => r.score < 70).length;
    const reportBased = allRows.filter((r) => r.bc > 0 || r.ns > 0 || r.cl > 0).length;
    return { total, avg, excellent, good, fair, pass, low, reportBased };
  }, [allRows]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  const canSign = user?.role === "super" || user?.role === "hr" || user?.role === "lead";
  const canEditDg = user?.role === "super" || user?.role === "hr" || user?.role === "lead";

  const startEdit = useCallback((r: ApiKpi) => {
    setEditing({ id: r.id, dg: r.dg, note: r.note ?? "" });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    try {
      await doUpdate(editing.id, { dg: editing.dg, note: editing.note || undefined });
      setEditing(null);
      refetch();
    } catch {
      // error displayed by mutation state
    }
  }, [editing, doUpdate, refetch]);

  const handleSign = useCallback(
    async (id: number, level: 1 | 2) => {
      try {
        await doSign(id, level);
        refetch();
      } catch {
        // error displayed by mutation state
      }
    },
    [doSign, refetch],
  );

  const deptNames = useMemo(
    () => DEPARTMENTS.map((d) => d.name).sort((a, b) => a.localeCompare(b, "vi")),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">KPI kỳ {periodLabel}</div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white p-0.5">
          <button
            onClick={() => setTab("table")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
              tab === "table" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-gray-100",
            )}
          >
            Bảng
          </button>
          <button
            onClick={() => setTab("chart")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
              tab === "chart" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-gray-100",
            )}
          >
            Biểu đồ
          </button>
        </div>
      </div>

      {/* Report-based scoring explanation */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-blue-800">
          <FileText size={14} /> KPI tự tính từ Báo cáo ngày
        </div>
        <div className="text-[11.5px] leading-relaxed text-blue-700">
          <strong>BC/25</strong> (Sản lượng): tổng SL hoàn thành từ báo cáo đã xác nhận &middot;
          <strong> NS/30</strong> (Năng suất): tỉ lệ ngày có báo cáo / ngày làm việc &middot;
          <strong> CL/25</strong> (Chất lượng): 25 &minus; (tỉ lệ NG &times; 25) &middot;
          <strong> ĐG/20</strong> (Đánh giá): Tổ trưởng chấm thủ công.
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Tổng NV", value: stats.total, color: "text-[var(--color-text-primary)]" },
            { label: "Điểm TB", value: stats.avg, color: "text-[var(--color-accent)]" },
            { label: "Xuất sắc", value: stats.excellent, color: "text-emerald-600" },
            { label: "Tốt", value: stats.good, color: "text-blue-600" },
            { label: "Khá", value: stats.fair, color: "text-amber-600" },
            { label: "Đạt", value: stats.pass, color: "text-gray-500" },
            { label: "Cần CT", value: stats.low, color: "text-red-600" },
            { label: "Có BC", value: stats.reportBased, color: "text-[var(--color-primary)]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2.5 text-center">
              <div className={cn("text-[18px] font-semibold font-[family-name:var(--font-mono)]", s.color)}>{s.value}</div>
              <div className="text-[10.5px] text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
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
                className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", !deptFilter && "font-semibold text-[var(--color-primary)]")}
              >
                Tất cả
              </button>
              {deptNames.map((d) => (
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
        <div className="text-[12px] text-[var(--color-text-muted)]">
          Hiển thị {rows.length} / {allRows.length}
        </div>
      </div>

      {/* Table view */}
      {tab === "table" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
              <table className="w-full min-w-[950px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                    <th className="w-10 px-3 py-3 font-medium">#</th>
                    <th className="px-3 py-3 font-medium">Nhân viên</th>
                    <th className="px-3 py-3 font-medium">Mã NV</th>
                    <th className="px-3 py-3 text-center font-medium" title="Sản lượng (từ báo cáo)">BC/25</th>
                    <th className="px-3 py-3 text-center font-medium" title="Năng suất (từ báo cáo)">NS/30</th>
                    <th className="px-3 py-3 text-center font-medium" title="Chất lượng (từ báo cáo)">CL/25</th>
                    <th className="px-3 py-3 text-center font-medium" title="Đánh giá Tổ trưởng">ĐG/20</th>
                    <th className="px-3 py-3 text-right font-medium">Tổng</th>
                    <th className="px-3 py-3 font-medium">Xếp loại</th>
                    <th className="px-3 py-3 text-center font-medium">L1</th>
                    <th className="px-3 py-3 text-center font-medium">L2</th>
                    <th className="w-16 px-3 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isEditing = editing?.id === r.id;
                    const isExpanded = expanded === r.id;
                    const editScore = isEditing ? r.bc + r.ns + r.cl + editing.dg : r.score;
                    const editRank = isEditing ? kpiClass(editScore) : (r.rank ?? "");
                    return (
                      <tr key={r.id} className={cn("group border-t border-[var(--color-border-light)]", isExpanded && "bg-gray-50/50")}>
                        <td className="px-3 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                          {r.computedRank}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-[var(--color-text-primary)]">{r.employee_name}</div>
                          {r.department_name && (
                            <div className="text-[11px] text-[var(--color-text-lighter)]">{r.department_name}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{r.employee_code}</td>

                        {/* BC, NS, CL are auto-calculated — read-only */}
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">
                          <span title="Tự tính từ báo cáo">{r.bc}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">
                          <span title="Tự tính từ báo cáo">{r.ns}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">
                          <span title="Tự tính từ báo cáo">{r.cl}</span>
                        </td>

                        {/* ĐG is editable by team lead */}
                        {isEditing ? (
                          <td className="px-1.5 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={editing.dg}
                              onChange={(e) => setEditing({ ...editing, dg: Math.min(20, Math.max(0, Number(e.target.value))) })}
                              className="w-12 rounded border border-[var(--color-accent)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)]"
                            />
                          </td>
                        ) : (
                          <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">
                            <span className="text-[var(--color-accent)]" title="Tổ trưởng chấm">{r.dg}</span>
                          </td>
                        )}

                        <td className={cn("px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold", scoreColor(editScore))}>
                          {editScore}
                        </td>

                        <td className="px-3 py-2.5">
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", classColor(editRank))}>
                            {editRank}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {r.signed_l1 ? (
                            <CheckCircle2 size={15} className="mx-auto text-[var(--color-success)]" />
                          ) : canSign && user?.role === "lead" ? (
                            <button onClick={() => handleSign(r.id, 1)} className="rounded bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] text-white hover:opacity-80">
                              Ký
                            </button>
                          ) : (
                            <Clock size={15} className="mx-auto text-[var(--color-text-lighter)]" />
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {r.signed_l2 ? (
                            <CheckCircle2 size={15} className="mx-auto text-[var(--color-success)]" />
                          ) : r.signed_l1 && canSign && (user?.role === "super" || user?.role === "hr") ? (
                            <button onClick={() => handleSign(r.id, 2)} className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] text-white hover:opacity-80">
                              Ký
                            </button>
                          ) : (
                            <Clock size={15} className="mx-auto text-[var(--color-text-lighter)]" />
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={handleSave} disabled={saving} className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-success-bg)]">
                                  <Save size={14} />
                                </button>
                                <button onClick={() => setEditing(null)} className="rounded p-1 text-[var(--color-text-lighter)] hover:bg-gray-100">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                {canEditDg && (
                                  <button onClick={() => startEdit(r)} title="Chấm ĐG" className="rounded p-1 text-[var(--color-text-lighter)] opacity-0 group-hover:opacity-100 hover:bg-gray-100">
                                    <Pencil size={14} />
                                  </button>
                                )}
                                <button onClick={() => setExpanded(isExpanded ? null : r.id)} className="rounded p-1 text-[var(--color-text-lighter)] hover:bg-gray-100">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Chart view */}
      {tab === "chart" && !isLoading && (
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-4">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Phân bố điểm KPI — {periodLabel}
          </div>
          <div className="flex flex-col gap-2">
            {rows.slice(0, 25).map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <div className="w-[140px] truncate text-[12px] text-[var(--color-text-secondary)]" title={r.employee_name}>
                  {r.employee_name}
                </div>
                <div className="relative flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      r.score >= 93 ? "bg-emerald-500" :
                      r.score >= 90 ? "bg-blue-500" :
                      r.score >= 83 ? "bg-amber-500" :
                      r.score >= 70 ? "bg-gray-400" :
                      "bg-red-500",
                    )}
                    style={{ width: `${r.score}%` }}
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-[family-name:var(--font-mono)] font-semibold text-[var(--color-text-secondary)]">
                    {r.score}
                  </span>
                </div>
                <span className={cn("w-[70px] text-right text-[11px] font-medium", classColor(r.rank ?? "").replace("bg-", "text-").split(" ")[1])}>
                  {r.rank}
                </span>
              </div>
            ))}
          </div>

          {/* Composition breakdown */}
          <div className="mt-6 border-t border-[var(--color-border-light)] pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-text-primary)]">
              <BarChart3 size={14} /> Cấu thành điểm trung bình
            </div>
            {allRows.length > 0 && (() => {
              const avgBc = Math.round(allRows.reduce((s, r) => s + r.bc, 0) / allRows.length * 10) / 10;
              const avgNs = Math.round(allRows.reduce((s, r) => s + r.ns, 0) / allRows.length * 10) / 10;
              const avgCl = Math.round(allRows.reduce((s, r) => s + r.cl, 0) / allRows.length * 10) / 10;
              const avgDg = Math.round(allRows.reduce((s, r) => s + r.dg, 0) / allRows.length * 10) / 10;
              return (
                <div className="grid grid-cols-4 gap-3">
                  <CompositionBar label="BC (Sản lượng)" value={avgBc} max={25} color="bg-blue-500" />
                  <CompositionBar label="NS (Năng suất)" value={avgNs} max={30} color="bg-emerald-500" />
                  <CompositionBar label="CL (Chất lượng)" value={avgCl} max={25} color="bg-amber-500" />
                  <CompositionBar label="ĐG (Đánh giá)" value={avgDg} max={20} color="bg-purple-500" />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function CompositionBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] font-semibold text-[var(--color-text-primary)]">{value}/{max}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
