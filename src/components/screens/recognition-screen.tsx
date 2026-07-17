"use client";

import { useMemo, useState, useCallback } from "react";
import { Award, Plus, Check, X, AlertTriangle } from "lucide-react";
import {
  fetchRewards,
  createReward as apiCreateReward,
  updateReward as apiUpdateReward,
  fetchImprovementPlans,
  fetchEmployees,
} from "@/lib/api";
import { useQuery, useMutation } from "@/lib/hooks";
import { formatMoney, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const TYPE_LABEL: Record<string, string> = {
  kpi_bonus: "Thưởng KPI",
  hot_bonus: "Thưởng nóng",
  recognition: "Ghi nhận",
};

const TYPE_COLOR: Record<string, string> = {
  kpi_bonus: "bg-emerald-100 text-emerald-700",
  hot_bonus: "bg-amber-100 text-amber-700",
  recognition: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const STEP_LABEL: Record<string, string> = {
  remind: "Nhắc nhở",
  training: "Đào tạo",
  commitment: "Cam kết",
};

export function RecognitionScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("2026-06");
  const [tab, setTab] = useState<"rewards" | "improvement">("rewards");
  const [showCreate, setShowCreate] = useState(false);

  const { data: rewardData, isLoading: loadingRewards, refetch: refetchRewards } = useQuery(
    () => fetchRewards(period), [period]
  );
  const { data: planData, isLoading: loadingPlans } = useQuery(
    () => fetchImprovementPlans(period), [period]
  );
  const { data: empData } = useQuery(() => fetchEmployees({ pageSize: 200 }), []);

  const { mutate: doCreate } = useMutation(
    (data: { employee_id: number; period: string; type: string; amount?: number; reason?: string }) =>
      apiCreateReward(data)
  );
  const { mutate: doUpdate } = useMutation(
    (id: number, action: "approve" | "reject") => apiUpdateReward(id, { action })
  );

  const rewards = useMemo(() => rewardData?.data ?? [], [rewardData]);
  const plans = useMemo(() => planData?.data ?? [], [planData]);
  const canApprove = user?.role === "super" || user?.role === "hr";

  const stats = useMemo(() => {
    const pending = rewards.filter((r) => r.status === "pending").length;
    const approved = rewards.filter((r) => r.status === "approved").length;
    const totalAmount = rewards.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0);
    return { pending, approved, totalAmount, planCount: plans.length };
  }, [rewards, plans]);

  const periodLabel = (() => {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  })();

  const [formEmployee, setFormEmployee] = useState(0);
  const [formType, setFormType] = useState("kpi_bonus");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");

  const handleCreate = useCallback(async () => {
    if (!formEmployee) return;
    try {
      await doCreate({
        employee_id: formEmployee,
        period,
        type: formType,
        amount: Number(formAmount) || 0,
        reason: formReason || undefined,
      });
      setShowCreate(false);
      setFormEmployee(0);
      setFormAmount("");
      setFormReason("");
      refetchRewards();
    } catch {
      // error shown by mutation state
    }
  }, [formEmployee, period, formType, formAmount, formReason, doCreate, refetchRewards]);

  const handleAction = useCallback(async (id: number, action: "approve" | "reject") => {
    try {
      await doUpdate(id, action);
      refetchRewards();
    } catch {
      // error shown by mutation state
    }
  }, [doUpdate, refetchRewards]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[14px] border border-[var(--color-border)] bg-white p-[14px]">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Khen thưởng & Cải thiện — Kỳ {periodLabel}
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[13px]"
          />
        </div>
        {canApprove && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
          >
            <Plus size={14} /> Đề xuất
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Chờ duyệt", value: stats.pending, color: "text-amber-600" },
          { label: "Đã duyệt", value: stats.approved, color: "text-emerald-600" },
          { label: "Tổng thưởng", value: formatMoney(stats.totalAmount), color: "text-[var(--color-accent)]" },
          { label: "Cải thiện", value: stats.planCount, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2.5">
            <div className={cn("text-[16px] font-semibold font-[family-name:var(--font-mono)]", s.color)}>
              {s.value}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-white p-1">
        {(["rewards", "improvement"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === t ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-muted)] hover:bg-gray-50"
            )}
          >
            {t === "rewards" ? `Khen thưởng (${rewards.length})` : `Cải thiện (${plans.length})`}
          </button>
        ))}
      </div>

      {tab === "rewards" && (
        loadingRewards ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
            <Award size={32} className="text-[var(--color-text-lighter)]" />
            <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Chưa có đề xuất khen thưởng</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
            <table className="w-full min-w-[800px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
                  <th className="px-3 py-3 font-medium">Nhân viên</th>
                  <th className="px-3 py-3 font-medium">Loại</th>
                  <th className="px-3 py-3 text-right font-medium">Số tiền</th>
                  <th className="px-3 py-3 font-medium">Lý do</th>
                  <th className="px-3 py-3 font-medium">Trạng thái</th>
                  {canApprove && <th className="px-3 py-3 font-medium w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-[var(--color-text-primary)]">{r.employee_name}</div>
                      <div className="text-[11px] text-[var(--color-text-lighter)]">{r.employee_code}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", TYPE_COLOR[r.type])}>
                        {TYPE_LABEL[r.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] font-medium">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-muted)] max-w-[200px] truncate">
                      {r.reason ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLOR[r.status])}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    {canApprove && (
                      <td className="px-3 py-2.5">
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAction(r.id, "approve")}
                              className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-success-bg)]"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => handleAction(r.id, "reject")}
                              className="rounded p-1 text-[var(--color-danger)] hover:bg-red-50"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "improvement" && (
        loadingPlans ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
            <AlertTriangle size={32} className="text-[var(--color-text-lighter)]" />
            <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Không có kế hoạch cải thiện</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-[14px] border border-[var(--color-border)] bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium text-[var(--color-text-primary)] text-[13px]">{p.employee_name}</div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    KPI: {p.kpi_score}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-lighter)]">{p.employee_code}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    {STEP_LABEL[p.step]}
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    p.status === "active" ? "bg-blue-100 text-blue-700" :
                    p.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {p.status === "active" ? "Đang thực hiện" : p.status === "completed" ? "Hoàn thành" : "Huỷ"}
                  </span>
                </div>
                {p.note && (
                  <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">{p.note}</div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Đề xuất khen thưởng</div>
              <button onClick={() => setShowCreate(false)}>
                <X size={18} className="text-[var(--color-text-lighter)]" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[12px] text-[var(--color-text-muted)]">Nhân viên</label>
                <select
                  value={formEmployee}
                  onChange={(e) => setFormEmployee(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
                >
                  <option value={0}>— Chọn nhân viên —</option>
                  {empData?.data?.map((e) => (
                    <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--color-text-muted)]">Loại thưởng</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
                >
                  <option value="kpi_bonus">Thưởng KPI</option>
                  <option value="hot_bonus">Thưởng nóng</option>
                  <option value="recognition">Ghi nhận</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--color-text-muted)]">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--color-text-muted)]">Lý do</label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px]"
                  placeholder="Mô tả lý do khen thưởng..."
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!formEmployee}
                className="mt-1 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
