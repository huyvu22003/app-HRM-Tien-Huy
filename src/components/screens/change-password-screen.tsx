"use client";

import { useState } from "react";
import { KeyRound, Lock, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function ChangePasswordScreen() {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (newPassword.length < 8) { setMessage("Mật khẩu mới phải có ít nhất 8 ký tự."); return; }
    if (newPassword !== confirmPassword) { setMessage("Xác nhận mật khẩu chưa khớp."); return; }
    setSaving(true);
    const result = await changePassword(currentPassword, newPassword);
    if (!result.success) setMessage(result.message ?? "Không đổi được mật khẩu.");
    setSaving(false);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-page-bg)] p-4">
      <div className="w-full max-w-md rounded-[20px] border border-[var(--color-border)] bg-white p-6 shadow-[0_18px_50px_rgba(15,47,90,0.14)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--color-accent)] text-white"><KeyRound size={24} /></div>
        <h1 className="mt-4 text-[22px] font-bold text-[var(--color-text-primary)]">Tạo mật khẩu mới</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">Đây là lần đăng nhập đầu tiên hoặc tài khoản vừa được HR đặt lại. Bạn phải đổi mật khẩu trước khi sử dụng hệ thống.</p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
          <label className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Mật khẩu tạm/hiện tại
            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-3"><Lock size={15} className="text-[var(--color-text-lighter)]" /><input autoFocus required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-full flex-1 bg-transparent text-[14px] outline-none" /></div>
          </label>
          <label className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Mật khẩu mới
            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-3"><ShieldCheck size={15} className="text-[var(--color-accent)]" /><input required minLength={8} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-full flex-1 bg-transparent text-[14px] outline-none" /></div>
          </label>
          <label className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Nhập lại mật khẩu mới
            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-3"><ShieldCheck size={15} className="text-[var(--color-accent)]" /><input required minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-full flex-1 bg-transparent text-[14px] outline-none" /></div>
          </label>
          <div className="text-[11.5px] text-[var(--color-text-muted)]">Tối thiểu 8 ký tự và phải khác mật khẩu hiện tại.</div>
          {message && <div className="rounded-[10px] bg-[var(--color-danger-bg)] px-3 py-2 text-[12px] text-[var(--color-danger)]">{message}</div>}
          <button disabled={saving} className="h-11 rounded-[10px] bg-[var(--color-accent)] text-[14px] font-semibold text-white disabled:opacity-50">{saving ? "Đang cập nhật…" : "Đổi mật khẩu và tiếp tục"}</button>
        </form>
        <button type="button" onClick={logout} className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[12px] text-[var(--color-text-muted)]"><LogOut size={14} /> Đăng xuất</button>
      </div>
    </div>
  );
}
