"use client";

import { useMemo, useState } from "react";
import { Plus, X, HeartHandshake, CheckCircle2, Clock, XCircle } from "lucide-react";
import { employees } from "@/lib/data/employees";
import { LEAVE_TYPES } from "@/lib/data/config";
import { hashName, cn } from "@/lib/utils";

const REQUEST_TYPES = ["PN", "PB", "VR"] as const;
const LEAVE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  LEAVE_TYPES.map((t) => [t.code, t.label])
);

function buildLeaveRequests() {
  return employees.slice(0, 10).map((e, idx: number) => {
    const h = hashName(e.name ?? String(idx));
    const types = REQUEST_TYPES;
    const status = h % 3 === 0 ? "pending" : h % 3 === 1 ? "approved" : "rejected";
    return {
      id: idx,
      name: e.name,
      type: types[h % 3],
      days: 1 + (h % 3),
      from: `${10 + (h % 15)}/06/2026`,
      status,
      approvedByLead: status !== "pending",
      approvedByHr: status === "approved",
    };
  });
}

export function LeaveScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"PN" | "PB" | "VR">("PN");
  const [days, setDays] = useState(1);

  const requests = useMemo(() => buildLeaveRequests(), []);

  const balance = { entitled: 12, carried: 2, used: 5, get remaining() {
    return this.entitled + this.carried - this.used;
  } };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Quy tắc phép năm</div>
        <ul className="list-inside list-disc text-[12.5px] text-[var(--color-text-muted)]">
          <li>Cơ bản 12 ngày phép/năm cho nhân viên chính thức.</li>
          <li>Cộng thêm 1 ngày phép cho mỗi 5 năm thâm niên.</li>
          <li>Tối đa 2 ngày phép năm (PN) được dùng mỗi tháng.</li>
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">Đơn nghỉ phép</div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          <Plus size={14} /> Tạo đơn nghỉ phép
        </button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-[700px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-lighter)]">
              <th className="px-4 py-3 font-medium">Nhân viên</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Số ngày</th>
              <th className="px-4 py-3 font-medium">Từ ngày</th>
              <th className="px-4 py-3 font-medium">Duyệt tổ trưởng</th>
              <th className="px-4 py-3 font-medium">Duyệt HR</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{LEAVE_TYPE_LABEL[r.type]}</td>
                <td className="px-4 py-2.5 font-[family-name:var(--font-mono)]">{r.days}</td>
                <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">
                  {r.from}
                </td>
                <td className="px-4 py-2.5">
                  {r.approvedByLead ? (
                    <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                  ) : (
                    <Clock size={15} className="text-[var(--color-text-lighter)]" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {r.approvedByHr ? (
                    <CheckCircle2 size={15} className="text-[var(--color-success)]" />
                  ) : (
                    <Clock size={15} className="text-[var(--color-text-lighter)]" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "flex w-fit items-center gap-1 rounded-[20px] px-2 py-0.5 text-[11px] font-medium",
                      r.status === "approved" && "bg-[var(--color-success-bg)] text-[var(--color-success)]",
                      r.status === "pending" && "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
                      r.status === "rejected" && "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                    )}
                  >
                    {r.status === "approved" && <CheckCircle2 size={11} />}
                    {r.status === "pending" && <Clock size={11} />}
                    {r.status === "rejected" && <XCircle size={11} />}
                    {r.status === "approved" ? "Đã duyệt" : r.status === "pending" ? "Chờ duyệt" : "Từ chối"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">Số dư phép năm</div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              ["Được cấp", balance.entitled],
              ["Chuyển kỳ", balance.carried],
              ["Đã dùng", balance.used],
              ["Còn lại", balance.remaining],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="font-[family-name:var(--font-mono)] text-[18px] font-semibold text-[var(--color-text-primary)]">
                  {val}
                </div>
                <div className="text-[11px] text-[var(--color-text-light)]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-maternity)] bg-[var(--color-maternity-bg)] p-[18px]">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-maternity)]">
            <HeartHandshake size={16} /> Chế độ thai sản
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--color-text-muted)]">
            2 trường hợp đang trong thời gian nghỉ thai sản theo quy định BHXH.
          </p>
          <button className="rounded-[8px] bg-[var(--color-maternity)] px-3 py-1.5 text-[12px] font-medium text-white">
            Đăng ký trường hợp mới
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-[20px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Tạo đơn nghỉ phép</div>
              <button onClick={() => setModalOpen(false)}>
                <X size={18} className="text-[var(--color-text-lighter)]" />
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              {(["PN", "PB", "VR"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeaveType(t)}
                  className={cn(
                    "rounded-[20px] border px-3 py-1.5 text-[12.5px] font-medium",
                    leaveType === t
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  )}
                >
                  {LEAVE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Số ngày nghỉ
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mb-4 h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />

            <div className="mb-4 rounded-[10px] bg-[var(--color-page-bg)] p-3 text-[12.5px] text-[var(--color-text-muted)]">
              Sẽ trừ <b className="text-[var(--color-text-primary)]">{days}</b> ngày phép loại{" "}
              <b className="text-[var(--color-text-primary)]">{LEAVE_TYPE_LABEL[leaveType]}</b> vào kỳ 06/2026.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-[8px] bg-[var(--color-accent)] py-2 text-[13px] font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                Gửi đơn
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-[8px] border border-[var(--color-border)] py-2 text-[13px] text-[var(--color-text-secondary)]"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
