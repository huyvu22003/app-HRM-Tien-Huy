"use client";

import { useMemo, useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  LogIn,
  UserPlus,
  Pencil,
  Trash2,
  Lock,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPLOYEES } from "@/lib/data/employees";

type AuditAction = "login" | "create" | "update" | "delete" | "lock" | "config" | "permission";

interface AuditEntry {
  id: number;
  user_name: string;
  user_role: string;
  action: AuditAction;
  entity: string;
  entity_id: string | null;
  detail: string;
  before: string | null;
  after: string | null;
  at: string;
}

const ACTION_LABEL: Record<AuditAction, string> = {
  login: "Đăng nhập",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  lock: "Chốt kỳ",
  config: "Cấu hình",
  permission: "Phân quyền",
};

const ACTION_ICON: Record<AuditAction, typeof LogIn> = {
  login: LogIn,
  create: UserPlus,
  update: Pencil,
  delete: Trash2,
  lock: Lock,
  config: Settings,
  permission: Shield,
};

const ACTION_COLOR: Record<AuditAction, string> = {
  login: "bg-blue-100 text-blue-700",
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  lock: "bg-purple-100 text-purple-700",
  config: "bg-gray-100 text-gray-600",
  permission: "bg-indigo-100 text-indigo-700",
};

function generateAuditLog(): AuditEntry[] {
  const now = new Date("2026-07-15T17:00:00+07:00");
  const entries: AuditEntry[] = [
    { id: 1, user_name: "Mr. Trung", user_role: "super", action: "login", entity: "auth", entity_id: null, detail: "Đăng nhập hệ thống", before: null, after: null, at: sub(now, 5) },
    { id: 2, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "login", entity: "auth", entity_id: null, detail: "Đăng nhập hệ thống", before: null, after: null, at: sub(now, 10) },
    { id: 3, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "update", entity: "employee", entity_id: "0087", detail: `Cập nhật hồ sơ ${EMPLOYEES[3]?.name ?? "NV"}`, before: "SĐT: 0901234567", after: "SĐT: 0909876543", at: sub(now, 25) },
    { id: 4, user_name: "Mr. Trung", user_role: "super", action: "lock", entity: "attendance", entity_id: "2026-06", detail: "Chốt bảng công tháng 06/2026", before: null, after: "locked=true", at: sub(now, 60) },
    { id: 5, user_name: "Mr. Trung", user_role: "super", action: "config", entity: "rules_config", entity_id: null, detail: "Cập nhật quy tắc hệ thống", before: "stdDays: 26", after: "stdDays: 26", at: sub(now, 90) },
    { id: 6, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "create", entity: "leave_request", entity_id: "LR-015", detail: "Tạo đơn phép cho Chu Nam Anh (2 ngày PN)", before: null, after: "status=pending", at: sub(now, 120) },
    { id: 7, user_name: "Nguyễn Văn Thiện", user_role: "lead", action: "update", entity: "leave_request", entity_id: "LR-015", detail: "Duyệt cấp 1 đơn phép Chu Nam Anh", before: "step=1, status=pending", after: "step=2, status=pending", at: sub(now, 115) },
    { id: 8, user_name: "Mr. Trung", user_role: "super", action: "update", entity: "leave_request", entity_id: "LR-015", detail: "Duyệt cấp 2 đơn phép Chu Nam Anh", before: "step=2, status=pending", after: "step=2, status=approved", at: sub(now, 100) },
    { id: 9, user_name: "Mr. Trung", user_role: "super", action: "permission", entity: "role_permissions", entity_id: null, detail: "Thay đổi quyền vai trò HR: bật salary.export", before: "allowed=0", after: "allowed=1", at: sub(now, 180) },
    { id: 10, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "create", entity: "employee", entity_id: "0082", detail: "Thêm nhân viên mới: Trần Văn Phúc", before: null, after: "department=Phay CNC", at: sub(now, 240) },
    { id: 11, user_name: "Mr. Trung", user_role: "super", action: "lock", entity: "kpi", entity_id: "2026-06", detail: "Ký duyệt KPI cấp 2 tháng 06/2026", before: "signed_l2=0", after: "signed_l2=1", at: sub(now, 300) },
    { id: 12, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "update", entity: "attendance", entity_id: "ATT-0142", detail: "Sửa công Nguyễn Văn Thiện (actual_days: 25→26)", before: "actual_days=25", after: "actual_days=26", at: sub(now, 360) },
    { id: 13, user_name: "Mr. Trung", user_role: "super", action: "config", entity: "login_config", entity_id: null, detail: "Đổi theme đăng nhập sang 'teal'", before: "theme=navy", after: "theme=teal", at: sub(now, 480) },
    { id: 14, user_name: "Ôn Thị Uy Lam", user_role: "hr", action: "delete", entity: "document", entity_id: "DOC-034", detail: "Xoá tài liệu đính kèm hồ sơ NV 0055", before: "file=hop_dong.pdf", after: null, at: sub(now, 600) },
    { id: 15, user_name: "Huy (IT)", user_role: "super", action: "login", entity: "auth", entity_id: null, detail: "Đăng nhập hệ thống", before: null, after: null, at: sub(now, 720) },
  ];
  return entries;
}

function sub(base: Date, minutes: number): string {
  return new Date(base.getTime() - minutes * 60_000).toISOString();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mo} ${hh}:${mm}`;
}

function roleColor(role: string) {
  switch (role) {
    case "super": return "text-purple-700";
    case "hr": return "text-blue-700";
    case "lead": return "text-green-700";
    default: return "text-gray-600";
  }
}

export function AuditScreen() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [showActionDrop, setShowActionDrop] = useState(false);

  const auditLog = useMemo(() => generateAuditLog(), []);

  const filtered = useMemo(() => {
    let list = auditLog;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.user_name.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q) ||
          (e.entity_id?.toLowerCase().includes(q) ?? false),
      );
    }
    if (actionFilter) {
      list = list.filter((e) => e.action === actionFilter);
    }
    return list;
  }, [auditLog, search, actionFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm người dùng, nội dung..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActionDrop((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)]"
          >
            <Filter size={13} />
            {actionFilter ? ACTION_LABEL[actionFilter as AuditAction] : "Hành động"}
            <ChevronDown size={13} />
          </button>
          {showActionDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 w-[180px] rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg">
              <button
                onClick={() => { setActionFilter(""); setShowActionDrop(false); }}
                className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", !actionFilter && "font-semibold text-[var(--color-primary)]")}
              >
                Tất cả
              </button>
              {(Object.keys(ACTION_LABEL) as AuditAction[]).map((a) => (
                <button
                  key={a}
                  onClick={() => { setActionFilter(a); setShowActionDrop(false); }}
                  className={cn("w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50", actionFilter === a && "font-semibold text-[var(--color-primary)]")}
                >
                  {ACTION_LABEL[a]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-[12px] text-[var(--color-text-muted)]">
        Hiển thị {filtered.length} / {auditLog.length} bản ghi
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
          <ScrollText size={32} className="text-[var(--color-text-lighter)]" />
          <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Không tìm thấy bản ghi</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((entry) => {
            const Icon = ACTION_ICON[entry.action];
            return (
              <div
                key={entry.id}
                className="rounded-[12px] border border-[var(--color-border)] bg-white px-4 py-3 transition hover:border-[var(--color-primary)]/30"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", ACTION_COLOR[entry.action])}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[12.5px] font-semibold", roleColor(entry.user_role))}>
                        {entry.user_name}
                      </span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", ACTION_COLOR[entry.action])}>
                        {ACTION_LABEL[entry.action]}
                      </span>
                      {entry.entity_id && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] text-[var(--color-text-muted)]">
                          {entry.entity_id}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">{entry.detail}</div>
                    {(entry.before || entry.after) && (
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                        {entry.before && (
                          <span className="text-[var(--color-text-muted)]">
                            Trước: <span className="rounded bg-red-50 px-1 text-red-600">{entry.before}</span>
                          </span>
                        )}
                        {entry.after && (
                          <span className="text-[var(--color-text-muted)]">
                            Sau: <span className="rounded bg-emerald-50 px-1 text-emerald-600">{entry.after}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-[11px] text-[var(--color-text-lighter)]">{fmtTime(entry.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
