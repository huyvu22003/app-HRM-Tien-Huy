"use client";

import { useState } from "react";
import { House, Fingerprint, CalendarDays, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Go, type MobileScreen } from "./nav";
import { MobileHome } from "./home";
import { MobileCheckIn } from "./attendance";
import { MobileLeave, MobileCreateLeave } from "./leave";
import { MobilePayslip, MobileApprovals, MobileReport, MobileKpi, MobileNotifications, MobileProfile } from "./more";

const TABS: { key: MobileScreen; label: string; icon: typeof House }[] = [
  { key: "home", label: "Trang chủ", icon: House },
  { key: "checkin", label: "Chấm công", icon: Fingerprint },
  { key: "leave", label: "Nghỉ phép", icon: CalendarDays },
  { key: "salary", label: "Lương", icon: Wallet },
  { key: "profile", label: "Cá nhân", icon: UserIcon },
];

// Màn hình có thanh tab dưới (màn gốc). Các màn phụ hiển thị toàn trang với nút quay lại.
const TAB_SCREENS: MobileScreen[] = ["home", "checkin", "leave", "salary", "profile"];

// Màn phụ thuộc nhóm tab nào (để tô sáng tab tương ứng nếu cần).
const TAB_OF: Record<MobileScreen, MobileScreen> = {
  home: "home", checkin: "checkin", leave: "leave", salary: "salary", profile: "profile",
  createLeave: "leave", approvals: "home", report: "home", kpi: "profile", notifications: "home",
};

export function MobileApp() {
  const [screen, setScreen] = useState<MobileScreen>("home");
  const go: Go = (s) => setScreen(s);
  const showTabs = TAB_SCREENS.includes(screen);
  const activeTab = TAB_OF[screen];

  function render() {
    switch (screen) {
      case "home": return <MobileHome go={go} />;
      case "checkin": return <MobileCheckIn go={go} />;
      case "leave": return <MobileLeave go={go} />;
      case "createLeave": return <MobileCreateLeave go={go} />;
      case "salary": return <MobilePayslip />;
      case "approvals": return <MobileApprovals go={go} />;
      case "report": return <MobileReport go={go} />;
      case "kpi": return <MobileKpi />;
      case "notifications": return <MobileNotifications go={go} />;
      case "profile": return <MobileProfile go={go} />;
      default: return <MobileHome go={go} />;
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--color-page-bg)]">
      <div key={screen} className="flex min-h-0 flex-1 flex-col">{render()}</div>

      {showTabs && (
        <nav
          className="flex flex-none border-t border-[var(--color-border)] bg-white/95 px-1.5 pt-2 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => go(t.key)} className="flex flex-1 flex-col items-center gap-1 py-1">
                <t.icon size={22} className={cn(active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]")} />
                <span className={cn("text-[10px] font-semibold", active ? "text-[var(--color-accent)]" : "text-[var(--color-text-lighter)]")}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
