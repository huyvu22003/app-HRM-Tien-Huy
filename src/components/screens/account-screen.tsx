"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Monitor, History, LogOut, UserRoundCog, Link2, Plus, RotateCcw, UsersRound, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";
import { useQuery } from "@/lib/hooks";
import { createAccount, fetchAccounts, resetAccountPassword, syncEmployeeAccounts, updateAccount, type ApiAccount, type ApiProvisionedAccount, type ApiSkippedAccount, type ApiUnlinkedEmployee } from "@/lib/api";

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

const ROLE_LABEL: Record<string, string> = { super: "Quản trị", hr: "Nhân sự", lead: "Tổ trưởng", staff: "Nhân viên" };

function inferEmployeeRole(employee: Pick<ApiUnlinkedEmployee, "department_name" | "position" | "level">): ApiAccount["role"] {
  const department = (employee.department_name ?? "").toLocaleLowerCase("vi");
  const management = `${employee.position ?? ""} ${employee.level ?? ""}`.toLocaleLowerCase("vi");
  if (/nhân\s*sự|nhan\s*su/.test(department)) return "hr";
  if (/(giám đốc|phó giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/.test(management)) return "lead";
  return "staff";
}

function downloadProvisionedAccounts(accounts: ApiProvisionedAccount[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["Mã nhân viên", "Họ tên", "Số điện thoại", "Quyền", "Mật khẩu tạm", "Hết hạn"],
    ...accounts.map((account) => [
      account.employeeCode,
      account.employeeName,
      account.phone,
      ROLE_LABEL[account.role] ?? account.role,
      account.temporaryPassword,
      new Date(account.expiresAt).toLocaleString("vi-VN"),
    ]),
  ];
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tai-khoan-nhan-vien-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AccountAdminPanel() {
  const { user, role: currentRole } = useAuth();
  const { data, refetch } = useQuery(() => fetchAccounts(), []);
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ApiAccount["role"]>("staff");
  const [linkTarget, setLinkTarget] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [temporaryCredential, setTemporaryCredential] = useState<{ phone: string; password: string; expiresAt: string } | null>(null);
  const [bulkCredentials, setBulkCredentials] = useState<ApiProvisionedAccount[]>([]);
  const [bulkSkipped, setBulkSkipped] = useState<ApiSkippedAccount[]>([]);
  const accounts = data?.accounts ?? [];
  const unlinked = data?.employeesWithoutAccount ?? [];
  const linkCounts = accounts.reduce<Record<number, number>>((out, account) => {
    if (account.employee_id) out[account.employee_id] = (out[account.employee_id] ?? 0) + 1;
    return out;
  }, {});
  const canReset = (account: ApiAccount) => account.id !== user?.id && (
    (currentRole === "hr" && (account.role === "lead" || account.role === "staff")) ||
    (currentRole === "super" && account.role !== "super")
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const created = await createAccount({ employeeId: Number(employeeId), phone, role });
      setTemporaryCredential({ phone, password: created.temporaryPassword, expiresAt: created.expiresAt });
      setEmployeeId(""); setPhone(""); setRole("staff");
      setMessage("Đã tạo tài khoản. Mật khẩu tạm chỉ nên cung cấp riêng cho đúng nhân viên."); refetch();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Không tạo được tài khoản."); }
    finally { setBusy(false); }
  }

  async function link(accountId: number) {
    const target = Number(linkTarget[accountId]);
    if (!target) return;
    setBusy(true); setMessage("");
    try { await updateAccount(accountId, { employeeId: target }); setMessage("Đã cập nhật liên kết tài khoản."); refetch(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Không cập nhật được liên kết."); }
    finally { setBusy(false); }
  }

  async function unlink(accountId: number) {
    if (!window.confirm("Bỏ liên kết tài khoản này khỏi hồ sơ nhân viên? Tài khoản vẫn còn nhưng sẽ không xem được dữ liệu cá nhân.")) return;
    setBusy(true); setMessage("");
    try { await updateAccount(accountId, { employeeId: null }); setMessage("Đã bỏ liên kết trùng."); refetch(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Không bỏ được liên kết."); }
    finally { setBusy(false); }
  }

  async function resetPassword(account: ApiAccount) {
    if (!window.confirm(`Đặt lại mật khẩu cho tài khoản ${account.phone}? Các phiên đăng nhập cũ sẽ mất hiệu lực.`)) return;
    setBusy(true); setMessage(""); setTemporaryCredential(null);
    try {
      const reset = await resetAccountPassword(account.id);
      setTemporaryCredential({ phone: account.phone, password: reset.temporaryPassword, expiresAt: reset.expiresAt });
      setMessage("Đã đặt lại mật khẩu. Mật khẩu tạm hết hạn sau 30 phút và bắt buộc đổi khi đăng nhập."); refetch();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Không đặt lại được mật khẩu."); }
    finally { setBusy(false); }
  }

  async function syncAllAccounts() {
    const eligible = unlinked.filter((employee) => employee.status === "Đang làm việc" && /^0\d{9}$/.test((employee.phone ?? "").replace(/\s+/g, "")));
    const roleCounts = eligible.reduce<Record<string, number>>((counts, employee) => {
      const inferredRole = inferEmployeeRole(employee);
      counts[inferredRole] = (counts[inferredRole] ?? 0) + 1;
      return counts;
    }, {});
    const summary = `HR: ${roleCounts.hr ?? 0}, Tổ trưởng/Quản lý: ${roleCounts.lead ?? 0}, Nhân viên: ${roleCounts.staff ?? 0}`;
    if (!window.confirm(`Tạo tài khoản cho tối đa ${eligible.length} nhân viên đang làm việc?\n${summary}\n\nMỗi người nhận mật khẩu tạm riêng và phải đổi khi đăng nhập lần đầu.`)) return;

    setBusy(true); setMessage(""); setTemporaryCredential(null); setBulkCredentials([]); setBulkSkipped([]);
    const created: ApiProvisionedAccount[] = [];
    const skipped = new Map<number, ApiSkippedAccount>();
    try {
      let remaining = 0;
      do {
        const result = await syncEmployeeAccounts();
        created.push(...result.created);
        result.skipped.forEach((item) => skipped.set(item.employeeId, item));
        remaining = result.remaining;
        if (remaining > 0 && result.created.length === 0) break;
      } while (remaining > 0);
      setBulkCredentials(created);
      setBulkSkipped(Array.from(skipped.values()));
      setMessage(`Đã tạo ${created.length} tài khoản. ${skipped.size} hồ sơ được bỏ qua để kiểm tra lại số điện thoại.`);
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đồng bộ được tài khoản hàng loạt.");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><UserRoundCog size={17} className="text-[var(--color-accent)]" /> Đồng bộ tài khoản nhân viên</div>
        {currentRole === "super" && <button type="button" disabled={busy || unlinked.length === 0} onClick={syncAllAccounts} className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"><UsersRound size={15} /> Đồng bộ tất cả</button>}
      </div>
      <div className="mb-4 text-[12px] text-[var(--color-text-muted)]">{accounts.length} tài khoản · {unlinked.length} nhân viên chưa có tài khoản</div>

      <form onSubmit={submit} className="grid gap-2 rounded-[12px] bg-[var(--color-page-bg)] p-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <select required value={employeeId} onChange={(e) => { const id = e.target.value; setEmployeeId(id); const employee = unlinked.find((x) => x.id === Number(id)); setPhone(employee?.phone ?? ""); if (employee) { const inferred = inferEmployeeRole(employee); setRole(currentRole === "hr" && inferred === "hr" ? "staff" : inferred); } }} className="h-10 rounded-[8px] border border-[var(--color-border)] bg-white px-2 text-[12px]">
          <option value="">Chọn nhân viên chưa có tài khoản</option>
          {unlinked.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
        </select>
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" className="h-10 rounded-[8px] border border-[var(--color-border)] bg-white px-3 text-[12px]" />
        <select value={role} onChange={(e) => setRole(e.target.value as ApiAccount["role"])} className="h-10 rounded-[8px] border border-[var(--color-border)] bg-white px-2 text-[12px]">
          <option value="staff">Nhân viên</option><option value="lead">Tổ trưởng</option>{currentRole === "super" && <><option value="hr">Nhân sự</option><option value="super">Quản trị</option></>}
        </select>
        <button disabled={busy} className="flex h-10 items-center justify-center gap-1 rounded-[8px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"><Plus size={14} /> Tạo</button>
      </form>
      {message && <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">{message}</div>}
      {temporaryCredential && (
        <div className="mt-3 rounded-[10px] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-3 text-[12px]">
          <div className="font-semibold text-[var(--color-text-primary)]">Thông tin cấp một lần</div>
          <div className="mt-1">Tài khoản: <b>{temporaryCredential.phone}</b></div>
          <div>Mật khẩu tạm: <b className="font-[family-name:var(--font-mono)] text-[14px]">{temporaryCredential.password}</b></div>
          <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">Hết hạn: {new Date(temporaryCredential.expiresAt).toLocaleString("vi-VN")}. Hãy chuyển riêng cho đúng nhân viên và đóng thông báo sau khi ghi nhận.</div>
          <button type="button" onClick={() => setTemporaryCredential(null)} className="mt-2 rounded-[7px] border border-[var(--color-border)] bg-white px-2.5 py-1 text-[11px]">Đã ghi nhận</button>
        </div>
      )}
      {bulkCredentials.length > 0 && (
        <div className="mt-3 rounded-[10px] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-3 text-[12px]">
          <div className="font-semibold text-[var(--color-text-primary)]">Đã tạo {bulkCredentials.length} tài khoản — thông tin cấp một lần</div>
          <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">Tải file và bàn giao riêng cho từng nhân viên. Mật khẩu tạm không được lưu lại trên hệ thống dưới dạng đọc được.</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadProvisionedAccounts(bulkCredentials)} className="flex items-center gap-1 rounded-[7px] bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white"><Download size={13} /> Tải danh sách CSV</button>
            <button type="button" onClick={() => setBulkCredentials([])} className="rounded-[7px] border border-[var(--color-border)] bg-white px-2.5 py-1 text-[11px]">Đã lưu an toàn, đóng</button>
          </div>
        </div>
      )}
      {bulkSkipped.length > 0 && <div className="mt-2 text-[11px] text-[var(--color-danger)]">{bulkSkipped.length} hồ sơ chưa được tạo do thiếu/trùng số điện thoại. Hãy đối soát rồi tạo riêng.</div>}

      <div className="mt-4 divide-y divide-[var(--color-border-light)]">
        {accounts.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold">{a.employee_name ?? "Chưa gắn nhân viên"}</div>
              <div className="text-[11.5px] text-[var(--color-text-muted)]">{a.phone} · {ROLE_LABEL[a.role] ?? a.role} · {a.active ? "Đang hoạt động" : "Đã khóa"}</div>
              {a.employee_id && linkCounts[a.employee_id] > 1 && <div className="mt-1 text-[11px] font-semibold text-[var(--color-danger)]">Cảnh báo: hồ sơ này đang gắn với nhiều tài khoản</div>}
            </div>
            {!a.employee_id && (
              <div className="flex gap-2">
                <select value={linkTarget[a.id] ?? ""} onChange={(e) => setLinkTarget((s) => ({ ...s, [a.id]: e.target.value }))} className="h-9 min-w-[220px] rounded-[8px] border border-[var(--color-border)] px-2 text-[12px]">
                  <option value="">Chọn hồ sơ để gắn</option>
                  {unlinked.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
                </select>
                <button type="button" disabled={busy || !linkTarget[a.id]} onClick={() => link(a.id)} className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px] disabled:opacity-50"><Link2 size={14} /> Gắn</button>
              </div>
            )}
            {a.employee_id && linkCounts[a.employee_id] > 1 && <button type="button" disabled={busy} onClick={() => unlink(a.id)} className="h-9 rounded-[8px] border border-[var(--color-danger)] px-3 text-[12px] text-[var(--color-danger)] disabled:opacity-50">Bỏ gắn</button>}
            {canReset(a) && <button type="button" disabled={busy} onClick={() => resetPassword(a)} className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px] disabled:opacity-50"><RotateCcw size={14} /> Đặt lại MK</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountScreen() {
  const { user, role, roleMeta, changePassword, logout } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault(); setPasswordMessage("");
    if (newPassword.length < 8) { setPasswordMessage("Mật khẩu mới phải có ít nhất 8 ký tự."); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage("Xác nhận mật khẩu chưa khớp."); return; }
    const result = await changePassword(currentPassword, newPassword);
    if (!result.success) { setPasswordMessage(result.message ?? "Không đổi được mật khẩu."); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordForm(false); setPasswordMessage("Đã đổi mật khẩu thành công.");
  }

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
              <button onClick={() => setShowPasswordForm((value) => !value)} className="rounded-[8px] border border-[var(--color-border)] px-3 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]">
                Đổi mật khẩu
              </button>
            </div>
            {showPasswordForm && <form onSubmit={submitPassword} className="grid gap-2 py-3 md:grid-cols-3"><input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px]" /><input required minLength={8} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px]" /><input required minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[12px]" /><button className="h-9 rounded-[8px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white md:col-span-3">Lưu mật khẩu mới</button></form>}
            {passwordMessage && <div className="py-2 text-[12px] text-[var(--color-text-muted)]">{passwordMessage}</div>}
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
