"use client";

import { useState } from "react";
import { Phone, Lock, Eye, EyeOff, ArrowRight, ScanFace, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { CyberLoader } from "@/components/ui/cyber-loader";
import { mono } from "./primitives";

const DEMO = [
  { phone: "0909000001", name: "BGĐ" },
  { phone: "0909000002", name: "HR" },
  { phone: "0909000003", name: "Tổ trưởng" },
  { phone: "0909000004", name: "Nhân viên" },
];

export function MobileLogin() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const [res] = await Promise.all([login(phone, password), new Promise((r) => setTimeout(r, 1000))]);
    if (!res.success) {
      setError(res.message ?? "Đăng nhập thất bại. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  if (loading) return <CyberLoader label="ĐANG ĐĂNG NHẬP" />;

  return (
    <div
      className="flex min-h-[100dvh] flex-col overflow-y-auto text-white"
      style={{ background: "linear-gradient(165deg,#0f2f5a 0%,#154a8f 55%,#1e6fd0 100%)", paddingTop: "calc(env(safe-area-inset-top,0px) + 60px)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 28px)" }}
    >
      <div className="flex flex-1 flex-col px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Tiến Huy" className="h-[46px] w-[46px] rounded-[13px] bg-white object-cover" />
          <div className="text-[12px] font-bold leading-tight tracking-wide">CÔNG TY TNHH CƠ KHÍ<br />KHUÔN MẪU TIẾN HUY</div>
        </div>

        <div className="mt-11">
          <div className="text-[30px] font-extrabold leading-tight tracking-tight">Hệ thống<br />Quản trị Nhân lực</div>
          <div className="mt-3 max-w-[290px] text-[13.5px] leading-relaxed text-white/78">Chấm công, nghỉ phép, lương thưởng và hiệu suất — minh bạch, chính xác, mọi lúc mọi nơi.</div>
        </div>

        <form onSubmit={submit} className="mt-9 rounded-[22px] bg-white p-5 text-[var(--color-text-primary)] shadow-[0_20px_40px_rgba(8,25,50,0.35)]">
          <div className="text-[18px] font-bold">Đăng nhập</div>
          <div className="mt-0.5 text-[12.5px] text-[var(--color-text-muted)]">Nhập SĐT nội bộ để tiếp tục</div>

          <label className="mb-1.5 mt-4 block text-[12px] font-semibold text-[var(--color-text-secondary)]">Số điện thoại</label>
          <div className="flex h-[46px] items-center gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-[#f8fafc] px-3.5 focus-within:border-[var(--color-accent)]">
            <Phone size={16} className="text-[var(--color-text-lighter)]" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="09xx xxx xxx" className={`${mono} h-full w-full bg-transparent text-[14px] outline-none`} />
          </div>

          <label className="mb-1.5 mt-3.5 block text-[12px] font-semibold text-[var(--color-text-secondary)]">Mật khẩu</label>
          <div className="flex h-[46px] items-center gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-white px-3.5 focus-within:border-[var(--color-accent)]">
            <Lock size={16} className="text-[var(--color-accent)]" />
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="h-full w-full bg-transparent text-[15px] tracking-widest outline-none" />
            <button type="button" onClick={() => setShow((s) => !s)} className="text-[var(--color-text-lighter)]">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--color-accent)] text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(30,111,208,0.35)]">
            Đăng nhập <ArrowRight size={18} />
          </button>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-lighter)]">
            <ScanFace size={15} /> Đăng nhập bằng Face ID
          </div>

          <div className="mt-4 border-t border-[var(--color-border-light)] pt-3">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-lighter)]">Tài khoản demo (mật khẩu 123456)</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO.map((d) => (
                <button key={d.phone} type="button" onClick={() => { setPhone(d.phone); setPassword("123456"); setError(""); }} className="rounded-[20px] border border-[var(--color-border)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-text-muted)]">{d.name}</button>
              ))}
            </div>
          </div>
        </form>

        <div className="mt-auto pt-6 text-center text-[11px] text-white/55">© 2026 Tiến Huy Mechanical · Bảo mật &amp; nội bộ</div>
      </div>
    </div>
  );
}
