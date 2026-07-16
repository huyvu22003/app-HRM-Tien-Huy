"use client";

import { useState } from "react";
import { Lock, Phone, AlertCircle, Users2, Building2, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ACCOUNTS, type Account } from "@/lib/data/accounts";
import { ROLE_META } from "@/lib/data/config";
import { getInitials, cn } from "@/lib/utils";

const ROLE_BADGE_STYLE: Record<string, string> = {
  super: "bg-[#e6e9fb] text-[#4a4fc4]",
  hr: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  lead: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  staff: "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]",
};

export function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts: Account[] = Object.values(ACCOUNTS);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = login(phone, password);
    if (!res.success) {
      setError(res.message ?? "Đăng nhập thất bại. Vui lòng thử lại.");
    } else {
      setError("");
    }
    setLoading(false);
  }

  function fillDemo(acc: Account) {
    setPhone(acc.phone);
    setPassword(acc.password);
    setError("");
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-accent)] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-white text-[17px] font-bold text-[var(--color-navy)]">
            TH
          </div>
          <div className="text-[15px] font-semibold">CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY</div>
        </div>

        <div>
          <h1 className="max-w-md text-[32px] font-bold leading-tight">
            Hệ thống Quản trị Nhân lực
          </h1>
          <p className="mt-3 max-w-md text-[14px] text-white/80">
            Quản lý nhân sự, chấm công, lương thưởng và hiệu suất tập trung, minh bạch và chính xác.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-[14px] bg-white/10 p-4">
              <Users2 size={18} className="mb-2 text-white/80" />
              <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">81</div>
              <div className="text-[11px] text-white/70">Nhân sự</div>
            </div>
            <div className="rounded-[14px] bg-white/10 p-4">
              <Building2 size={18} className="mb-2 text-white/80" />
              <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">22</div>
              <div className="text-[11px] text-white/70">Bộ phận</div>
            </div>
            <div className="rounded-[14px] bg-white/10 p-4">
              <Layers size={18} className="mb-2 text-white/80" />
              <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">4</div>
              <div className="text-[11px] text-white/70">Khối</div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-white/50">© 2026 Tiến Huy Mechanical. Bảo mật & nội bộ.</div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-navy)] text-[15px] font-bold text-white">
              TH
            </div>
          </div>

          <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)]">Đăng nhập</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-light)]">
            Đăng nhập bằng số điện thoại nội bộ để tiếp tục.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  className="h-11 w-full rounded-[10px] border border-[var(--color-border)] pl-9 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-[10px] border border-[var(--color-border)] pl-9 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 rounded-[10px] bg-[var(--color-accent)] text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          {demoAccounts.length > 0 && (
            <div className="mt-8">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-lighter)]">
                Tài khoản demo
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    onClick={() => fillDemo(acc)}
                    className="flex flex-col items-start gap-1.5 rounded-[12px] border border-[var(--color-border)] p-3 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-page-bg)]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-navy)] text-[10px] font-semibold text-white">
                        {getInitials(acc.name ?? "?")}
                      </div>
                      <div className="text-[12px] font-medium text-[var(--color-text-primary)]">{acc.name}</div>
                    </div>
                    <span
                      className={cn(
                        "rounded-[20px] px-2 py-0.5 text-[10px] font-medium",
                        ROLE_BADGE_STYLE[acc.role] ?? ROLE_BADGE_STYLE.staff
                      )}
                    >
                      {ROLE_META[acc.role]?.label ?? acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
