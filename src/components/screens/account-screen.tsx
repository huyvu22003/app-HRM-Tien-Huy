"use client";

import { KeyRound, ShieldCheck, Monitor, History, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";

const ROLE_SCOPE: Record<string, string> = {
  super: "Toàn quyền cấu hình hệ thống, phân quyền và công thức lương.",
  hr: "Quản lý hồ sơ nhân sự, chấm công, phép và lương toàn công ty.",
  lead: "Xem và duyệt phép, chấm công cho tổ/bộ phận phụ trách.",
  staff: "Xem thông tin cá nhân và gửi đơn nghỉ phép.",
};

const ACTIVITY = [
  { action: "Đăng nhập hệ thống", time: "Hôm nay, 08:12" },
  { action: "Duyệt đơn nghỉ phép", time: "Hôm qua, 16:40" },
  { action: "Cập nhật hồ sơ cá nhân", time: "12/06/2026" },
];

export function AccountScreen() {
  const { user, role, roleMeta, logout } = useAuth();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col items-center rounded-[14px] border border-[var(--color-border)] bg-white p-[18px] text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-[22px] font-semibold text-white">
          {getInitials(user?.name ?? "?")}
        </div>
        <div className="mt-3 text-[15px] font-semibold text-[var(--color-text-primary)]">{user?.name}</div>
        <span className="mt-1 rounded-[20px] bg-[var(--color-page-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
          {roleMeta?.label ?? role}
        </span>
        <p className="mt-2 text-[12px] text-[var(--color-text-light)]">
          {(role && ROLE_SCOPE[role]) ?? "Không xác định phạm vi truy cập."}
        </p>

        <div className="mt-5 w-full border-t border-[var(--color-border-light)] pt-4 text-left text-[12.5px] text-[var(--color-text-muted)]">
          <div className="flex justify-between py-1">
            <span>Điện thoại</span>
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-primary)]">
              {user?.phone ?? "-"}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span>Email</span>
            <span className="text-[var(--color-text-primary)]">{user?.email ?? "-"}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Bộ phận</span>
            <span className="text-[var(--color-text-primary)]">{user?.department ?? "-"}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Mã nhân viên</span>
            <span className="font-[family-name:var(--font-mono)] text-[var(--color-text-primary)]">
              {user?.code ?? "-"}
            </span>
          </div>
        </div>

        <button
          onClick={() => logout?.()}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--color-danger-bg)] py-2 text-[12.5px] font-medium text-[var(--color-danger)]"
        >
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
            <KeyRound size={16} className="text-[var(--color-accent)]" /> Bảo mật
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-border-light)]">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[12.5px] text-[var(--color-text-muted)]">Mật khẩu đăng nhập</span>
              <button className="rounded-[8px] border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
                Đổi mật khẩu
              </button>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
                <ShieldCheck size={14} /> Xác thực 2 lớp (2FA)
              </span>
              <button className="rounded-[8px] border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
                Bật 2FA
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
            <Monitor size={16} className="text-[var(--color-accent)]" /> Phiên đăng nhập
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-light)] p-3 text-[12.5px]">
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">Trình duyệt hiện tại</div>
              <div className="text-[var(--color-text-light)]">Đang hoạt động · Việt Nam</div>
            </div>
            <span className="rounded-[20px] bg-[var(--color-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-success)]">
              Đang mở
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
            <History size={16} className="text-[var(--color-accent)]" /> Hoạt động gần đây
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-border-light)]">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-[12.5px]">
                <span className="text-[var(--color-text-muted)]">{a.action}</span>
                <span className="text-[var(--color-text-lighter)]">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
