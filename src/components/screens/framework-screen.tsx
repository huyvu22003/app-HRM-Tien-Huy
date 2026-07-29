"use client";

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
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { key: string; label: string; icon: LucideIcon; status: "base" | "live" | "priority" | "later" };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Nền tảng & Tổng quan",
    items: [
      { key: "framework", label: "Sơ đồ khung", icon: LayoutDashboard, status: "base" },
      { key: "dashboard", label: "Dashboard BGĐ", icon: BarChart3, status: "live" },
    ],
  },
  {
    title: "Nhân sự",
    items: [
      { key: "employees", label: "Nhân viên", icon: Users, status: "live" },
      { key: "org", label: "Sơ đồ tổ chức", icon: GitBranch, status: "live" },
    ],
  },
  {
    title: "Vận hành",
    items: [
      { key: "attendance", label: "Chấm công", icon: Clock, status: "live" },
      { key: "leave", label: "Nghỉ phép", icon: CalendarDays, status: "live" },
      { key: "salary", label: "Lương thưởng", icon: Banknote, status: "live" },
      { key: "report", label: "Báo cáo ngày", icon: FileText, status: "live" },
    ],
  },
  {
    title: "Hiệu suất",
    items: [
      { key: "kpi", label: "KPI & Xếp hạng", icon: Target, status: "live" },
      { key: "recognition", label: "Khen thưởng", icon: Award, status: "live" },
      { key: "payroll", label: "Payroll đối chiếu", icon: Scale, status: "live" },
    ],
  },
  {
    title: "Phát triển & Quản trị",
    items: [
      { key: "training", label: "Đào tạo", icon: GraduationCap, status: "live" },
      { key: "permissions", label: "Phân quyền", icon: Shield, status: "live" },
      { key: "config", label: "Cấu hình", icon: Settings, status: "live" },
      { key: "formula", label: "Công thức lương", icon: Calculator, status: "live" },
      { key: "audit", label: "Audit log", icon: ScrollText, status: "live" },
    ],
  },
];

const STATUS_STYLE: Record<Item["status"], { label: string; dot: string; bg: string }> = {
  base: { label: "Nền tảng", dot: "bg-[var(--color-text-lighter)]", bg: "" },
  live: { label: "Đang có", dot: "bg-[var(--color-success)]", bg: "" },
  priority: { label: "Ưu tiên mới", dot: "bg-[var(--color-warning)]", bg: "" },
  later: { label: "Giai đoạn sau", dot: "bg-[var(--color-text-lighter)]", bg: "" },
};

export function FrameworkScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[14px] bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-accent)] p-7 text-white">
        <div className="text-[18px] font-semibold">Kiến trúc hệ thống HRM Tiến Huy</div>
        <p className="mt-2 max-w-2xl text-[13px] text-white/80">
          Nền tảng quản trị nhân lực hợp nhất dữ liệu nhân sự, chấm công, phép năm, lương thưởng và hiệu
          suất trên một hệ thống duy nhất — phân quyền theo vai trò, minh bạch theo thời gian thực.
        </p>
        <div className="mt-5 flex gap-8">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">81</div>
            <div className="text-[11px] text-white/70">Nhân sự</div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">22</div>
            <div className="text-[11px] text-white/70">Bộ phận</div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[22px] font-semibold">16</div>
            <div className="text-[11px] text-white/70">Phân hệ</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[12px]">
        {(Object.keys(STATUS_STYLE) as Item["status"][]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[s].dot)} />
            {STATUS_STYLE[s].label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
            <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">{group.title}</div>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const st = STATUS_STYLE[item.status];
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className="flex items-center justify-between rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-page-bg)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className="text-[var(--color-accent)]" />
                      <span className="text-[13px] text-[var(--color-text-secondary)]">{item.label}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10.5px] text-[var(--color-text-light)]">
                      <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Phân quyền theo vai trò
          </div>
          <div className="flex flex-col gap-2 text-[12.5px] text-[var(--color-text-muted)]">
            <div>
              <b className="text-[var(--color-text-secondary)]">Giám đốc</b> — xem toàn bộ dữ liệu, không chỉnh sửa vận
              hành hằng ngày.
            </div>
            <div>
              <b className="text-[var(--color-text-secondary)]">Super Admin</b> — toàn quyền cấu hình hệ thống, phân
              quyền, công thức lương.
            </div>
            <div>
              <b className="text-[var(--color-text-secondary)]">HR</b> — quản lý hồ sơ nhân sự, chấm công, phép, lương.
            </div>
            <div>
              <b className="text-[var(--color-text-secondary)]">Tổ trưởng</b> — xem & duyệt phép, chấm công tổ mình.
            </div>
            <div>
              <b className="text-[var(--color-text-secondary)]">Nhân viên</b> — xem thông tin cá nhân, gửi đơn phép.
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
          <div className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
            Lộ trình triển khai
          </div>
          <div className="flex flex-col gap-3 text-[12.5px]">
            {[
              "Giai đoạn 1 · Nhân sự, chấm công, phép năm, lương",
              "Giai đoạn 2 · KPI, khen thưởng, đối chiếu payroll",
              "Giai đoạn 3 · Đào tạo, audit log, báo cáo nâng cao",
            ].map((phase, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2
                  size={16}
                  className="text-[var(--color-success)]"
                />
                <span className="text-[var(--color-text-muted)]">{phase}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
