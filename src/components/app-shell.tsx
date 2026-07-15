"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  GitBranch,
  Clock,
  CalendarDays,
  Banknote,
  FileText,
  Target,
  Award,
  Scale,
  GraduationCap,
  Shield,
  Settings,
  Calculator,
  ScrollText,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getInitials, cn } from "@/lib/utils";

type NavItem = {
  key: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { key: "framework", label: "Sơ đồ khung", group: "TỔNG QUAN", icon: LayoutDashboard },
  { key: "dashboard", label: "Dashboard BGĐ", group: "TỔNG QUAN", icon: BarChart3 },
  { key: "employees", label: "Nhân viên", group: "NHÂN SỰ", icon: Users },
  { key: "org", label: "Sơ đồ tổ chức", group: "NHÂN SỰ", icon: GitBranch },
  { key: "attendance", label: "Chấm công", group: "VẬN HÀNH", icon: Clock },
  { key: "leave", label: "Phép năm", group: "VẬN HÀNH", icon: CalendarDays },
  { key: "salary", label: "Lương thưởng", group: "VẬN HÀNH", icon: Banknote },
  { key: "report", label: "Báo cáo ngày", group: "VẬN HÀNH", icon: FileText },
  { key: "kpi", label: "KPI & Xếp hạng", group: "HIỆU SUẤT", icon: Target },
  { key: "recognition", label: "Khen thưởng", group: "HIỆU SUẤT", icon: Award },
  { key: "payroll", label: "Payroll đối chiếu", group: "HIỆU SUẤT", icon: Scale },
  { key: "training", label: "Đào tạo", group: "PHÁT TRIỂN", icon: GraduationCap },
  { key: "permissions", label: "Phân quyền", group: "QUẢN TRỊ", icon: Shield },
  { key: "config", label: "Cấu hình", group: "QUẢN TRỊ", icon: Settings },
  { key: "formula", label: "Công thức lương", group: "QUẢN TRỊ", icon: Calculator },
  { key: "audit", label: "Audit log", group: "QUẢN TRỊ", icon: ScrollText },
];

const GROUP_ORDER = ["TỔNG QUAN", "NHÂN SỰ", "VẬN HÀNH", "HIỆU SUẤT", "PHÁT TRIỂN", "QUẢN TRỊ"];

// The seed data's ROLE_META.nav uses a different, coarser key vocabulary than
// this app's screen keys, so screen visibility is mapped explicitly per role here.
const ROLE_SCREENS: Record<string, string[]> = {
  super: [
    "framework",
    "dashboard",
    "employees",
    "org",
    "attendance",
    "leave",
    "salary",
    "report",
    "kpi",
    "recognition",
    "payroll",
    "training",
    "permissions",
    "config",
    "formula",
    "audit",
  ],
  hr: [
    "framework",
    "dashboard",
    "employees",
    "org",
    "attendance",
    "leave",
    "salary",
    "report",
    "kpi",
    "recognition",
    "payroll",
    "training",
  ],
  lead: ["framework", "dashboard", "employees", "org", "attendance", "leave", "kpi"],
  staff: ["framework", "dashboard", "attendance", "leave"],
};

const NOTIFICATIONS = [
  { id: 1, title: "Đơn phép chờ duyệt", desc: "Nguyễn Văn Thiện xin nghỉ phép 2 ngày", time: "10 phút trước" },
  { id: 2, title: "Chấm công lệch", desc: "3 nhân viên có công lệch chuẩn tháng 06", time: "1 giờ trước" },
  { id: 3, title: "KPI tháng 06 đã chốt", desc: "Kết quả xếp hạng đã sẵn sàng xem", time: "3 giờ trước" },
  { id: 4, title: "Nhân viên mới", desc: "Đã thêm hồ sơ nhân viên Chu Nam Anh", time: "Hôm qua" },
];

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  framework: { title: "Sơ đồ khung hệ thống", subtitle: "Kiến trúc tổng thể & lộ trình triển khai" },
  dashboard: { title: "Dashboard BGĐ", subtitle: "Tổng quan nhân sự & vận hành" },
  employees: { title: "Nhân viên", subtitle: "Danh sách & hồ sơ nhân sự" },
  org: { title: "Sơ đồ tổ chức", subtitle: "Khối · Bộ phận · Nhân sự" },
  attendance: { title: "Chấm công", subtitle: "Công chuẩn & công thực tế theo kỳ" },
  leave: { title: "Phép năm", subtitle: "Đơn nghỉ phép & số dư phép" },
  salary: { title: "Lương thưởng", subtitle: "Bảng lương kỳ 06/2026" },
  report: { title: "Báo cáo ngày", subtitle: "Tổng hợp hoạt động trong ngày" },
  kpi: { title: "KPI & Xếp hạng", subtitle: "Đánh giá hiệu suất theo bộ phận" },
  recognition: { title: "Khen thưởng", subtitle: "Ghi nhận & khen thưởng nhân viên" },
  payroll: { title: "Payroll đối chiếu", subtitle: "Đối chiếu bảng lương thực chi" },
  training: { title: "Đào tạo", subtitle: "Kế hoạch đào tạo & kỹ năng" },
  permissions: { title: "Phân quyền", subtitle: "Ma trận quyền theo vai trò" },
  config: { title: "Cấu hình", subtitle: "Cấu hình hệ thống & quy tắc" },
  formula: { title: "Công thức lương", subtitle: "Chuỗi tính lương & thuế TNCN" },
  audit: { title: "Audit log", subtitle: "Nhật ký thao tác hệ thống" },
  account: { title: "Tài khoản của tôi", subtitle: "Thông tin & bảo mật tài khoản" },
  "employee-detail": { title: "Hồ sơ nhân viên", subtitle: "Thông tin chi tiết nhân sự" },
};

export function AppShell({
  currentScreen,
  onNavigate,
  children,
}: {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  children: React.ReactNode;
}) {
  const { user, role, roleMeta, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const allowedNav: string[] = (role && ROLE_SCREENS[role]) || Object.values(ROLE_SCREENS).flat();
  const visibleItems = NAV_ITEMS.filter((item) => allowedNav.includes(item.key));

  const meta = PAGE_META[currentScreen] ?? { title: "", subtitle: "" };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-[246px] shrink-0 flex-col bg-[var(--color-navy)] text-white">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[15px] font-bold text-[var(--color-navy)]">
            TH
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-white">Tiến Huy</div>
            <div className="text-[9px] tracking-wide text-[var(--color-sidebar-text)]">
              HRM · QUẢN TRỊ NHÂN LỰC
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUP_ORDER.map((group) => {
            const items = visibleItems.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold tracking-wider text-[var(--color-sidebar-text)]">
                  {group}
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = currentScreen === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onNavigate(item.key)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] transition-colors",
                          active
                            ? "bg-[var(--color-accent)] font-medium text-white"
                            : "text-[#c4d2e0] hover:bg-white/10"
                        )}
                      >
                        <Icon size={16} className={active ? "text-white" : "text-[#8ba0b8]"} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-[var(--color-sidebar-text)]">
          <div>81 nhân sự · 22 bộ phận</div>
          <div>Kỳ dữ liệu: 06/2026</div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-white px-6">
          <div>
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{meta.title}</div>
            <div className="text-[12px] text-[var(--color-text-light)]">{meta.subtitle}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]"
              />
              <input
                placeholder="Tìm kiếm..."
                className="h-9 w-56 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-page-bg)] pl-8 pr-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="hidden rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] lg:block">
              Tháng 06/2026
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setAccountOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--color-text-muted)] hover:bg-[var(--color-page-bg)]"
              >
                <Bell size={17} />
                <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-[var(--color-danger)]" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-20 w-80 rounded-[14px] border border-[var(--color-border)] bg-white shadow-lg">
                  <div className="border-b border-[var(--color-border-light)] px-4 py-3 text-[13px] font-semibold">
                    Thông báo
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {NOTIFICATIONS.map((n) => (
                      <div
                        key={n.id}
                        className="border-b border-[var(--color-border-light)] px-4 py-3 last:border-0 hover:bg-[var(--color-page-bg)]"
                      >
                        <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">{n.title}</div>
                        <div className="text-[12px] text-[var(--color-text-light)]">{n.desc}</div>
                        <div className="mt-1 text-[11px] text-[var(--color-text-lighter)]">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-[8px] py-1 pl-1 pr-2 hover:bg-[var(--color-page-bg)]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[12px] font-semibold text-white">
                  {getInitials(user?.name ?? "?")}
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-[12.5px] font-medium text-[var(--color-text-primary)]">{user?.name}</div>
                  <div className="text-[11px] text-[var(--color-text-light)]">{roleMeta?.label ?? role}</div>
                </div>
                <ChevronDown size={14} className="text-[var(--color-text-lighter)]" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-11 z-20 w-52 rounded-[14px] border border-[var(--color-border)] bg-white py-1.5 shadow-lg">
                  <button
                    onClick={() => {
                      setAccountOpen(false);
                      onNavigate("account");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-page-bg)]"
                  >
                    <UserIcon size={15} />
                    Tài khoản của tôi
                  </button>
                  <button
                    onClick={() => logout?.()}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                  >
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--color-page-bg)] p-6">{children}</main>
      </div>
    </div>
  );
}
