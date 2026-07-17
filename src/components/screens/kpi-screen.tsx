"use client";

import { useMemo, useState, useCallback } from "react";
import { CheckCircle2, Clock, Pencil, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  fetchKpi,
  updateKpi as apiUpdateKpi,
  signKpi as apiSignKpi,
  type ApiKpi,
} from "@/lib/api";
import { useQuery, useMutation } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

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
  bc: number;
  ns: number;
  cl: number;
  dg: number;
  note: string;
}

export function KpiScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("2026-06");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery(() => fetchKpi(period), [period]);

  const { mutate: doUpdate, isLoading: saving } = useMutation(
    (id: number, body: { bc?: number; ns?: number; cl?: number; dg?: number; note?: string }) =>
      apiUpdateKpi(id, body)
  );

  const { mutate: doSign } = useMutation(
    (id: number, level: 1 | 2) => apiSignKpi(id, level)
  );

  const rows = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, computedRank: i + 1 }));
  }, [data]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const total = rows.length;
    const avg = Math.round(rows.reduce((s, r) => s + r.score, 0) / total * 10) / 10;
    const excellent = rows.filter((r) => r.score >= 93).length;
    const good = rows.filter((r) => r.score >= 90 && r.score < 93).length;
    const fair = rows.filter((r) => r.score >= 83 && r.score < 90).length;
    const pass = rows.filter((r) => r.score >= 70 && r.score < 83).length;
    const low = rows.filter((r) => r.score < 70).length;
    return { total, avg, excellent, good, fair, pass, low };
  }, [rows]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  const canSign = user?.role === "super" || user?.role === "hr" || user?.role === "lead";

  const startEdit = useCallback((r: ApiKpi) => {
    setEditing({ id: r.id, bc: r.bc, ns: r.ns, cl: r.cl, dg: r.dg, note: r.note ?? "" });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    await doUpdate(editing.id, {
      bc: editing.bc,
      ns: editing.ns,
      cl: editing.cl,
      dg: editing.dg,
      note: editing.note || undefined,
    });
    setEditing(null);
    refetch();
  }, [editing, doUpdate, refetch]);

  const handleSign = useCallback(async (id: number, level: 1 | 2) => {
    await doSign(id, level);
    refetch();
  }, [doSign, refetch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">KPI kỳ {periodLabel}</div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
        />
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Tổng NV", value: stats.total, color: "text-[var(--color-text-primary)]" },
            { label: "Điểm TB", value: stats.avg, color: "text-[var(--color-accent)]" },
            { label: "Xuất sắc", value: stats.excellent, color: "text-emerald-600" },
            { label: "Tốt", value: stats.good, color: "text-blue-600" },
            { label: "Khá", value: stats.fair, color: "text-amber-600" },
            { label: "Đạt", value: stats.pass, color: "text-gray-500" },
            { label: "Cần CT", value: stats.low, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2.5 text-center">
              <div className={cn("text-[18px] font-semibold font-[family-name:var(--font-mono)]", s.color)}>{s.value}</div>
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
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                <th className="px-3 py-3 font-medium w-10">#</th>
                <th className="px-3 py-3 font-medium">Nhân viên</th>
                <th className="px-3 py-3 font-medium">Mã NV</th>
                <th className="px-3 py-3 text-center font-medium">BC/25</th>
                <th className="px-3 py-3 text-center font-medium">NS/30</th>
                <th className="px-3 py-3 text-center font-medium">CL/25</th>
                <th className="px-3 py-3 text-center font-medium">DG/20</th>
                <th className="px-3 py-3 text-right font-medium">Tổng</th>
                <th className="px-3 py-3 font-medium">Xếp loại</th>
                <th className="px-3 py-3 text-center font-medium">L1</th>
                <th className="px-3 py-3 text-center font-medium">L2</th>
                <th className="px-3 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isEditing = editing?.id === r.id;
                const isExpanded = expanded === r.id;
                return (
                  <tr key={r.id} className="group border-t border-[var(--color-border-light)]">
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

                    {isEditing ? (
                      <>
                        <td className="px-1.5 py-2.5 text-center">
                          <input type="number" min={0} max={25} value={editing.bc}
                            onChange={(e) => setEditing({ ...editing, bc: Math.min(25, Math.max(0, Number(e.target.value))) })}
                            className="w-12 rounded border border-[var(--color-accent)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)]"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-center">
                          <input type="number" min={0} max={30} value={editing.ns}
                            onChange={(e) => setEditing({ ...editing, ns: Math.min(30, Math.max(0, Number(e.target.value))) })}
                            className="w-12 rounded border border-[var(--color-accent)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)]"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-center">
                          <input type="number" min={0} max={25} value={editing.cl}
                            onChange={(e) => setEditing({ ...editing, cl: Math.min(25, Math.max(0, Number(e.target.value))) })}
                            className="w-12 rounded border border-[var(--color-accent)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)]"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-center">
                          <input type="number" min={0} max={20} value={editing.dg}
                            onChange={(e) => setEditing({ ...editing, dg: Math.min(20, Math.max(0, Number(e.target.value))) })}
                            className="w-12 rounded border border-[var(--color-accent)] px-1 py-0.5 text-center text-[12px] font-[family-name:var(--font-mono)]"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">{r.bc}</td>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">{r.ns}</td>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">{r.cl}</td>
                        <td className="px-3 py-2.5 text-center font-[family-name:var(--font-mono)] text-[12px]">{r.dg}</td>
                      </>
                    )}

                    <td className={cn("px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-semibold", scoreColor(isEditing ? editing.bc + editing.ns + editing.cl + editing.dg : r.score))}>
                      {isEditing ? editing.bc + editing.ns + editing.cl + editing.dg : r.score}
                    </td>

                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", classColor(isEditing ? kpiClass(editing.bc + editing.ns + editing.cl + editing.dg) : (r.rank ?? "")))}>
                        {isEditing ? kpiClass(editing.bc + editing.ns + editing.cl + editing.dg) : r.rank}
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
                            {(user?.role === "super" || user?.role === "hr" || user?.role === "lead") && (
                              <button onClick={() => startEdit(r)} className="rounded p-1 text-[var(--color-text-lighter)] opacity-0 group-hover:opacity-100 hover:bg-gray-100">
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
    </div>
  );
}
