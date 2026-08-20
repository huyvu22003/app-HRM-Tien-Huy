"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { CyberLoader } from "@/components/ui/cyber-loader";
import { LoginScreen } from "@/components/screens/login-screen";
import { MobileApp } from "@/components/mobile/mobile-app";
import { useIsMobile } from "@/lib/use-is-mobile";
import { FrameworkScreen } from "@/components/screens/framework-screen";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { EmployeesScreen } from "@/components/screens/employees-screen";
import { EmployeeDetailScreen } from "@/components/screens/employee-detail-screen";
import { OrgScreen } from "@/components/screens/org-screen";
import { AttendanceScreen } from "@/components/screens/attendance-screen";
import { LeaveScreen } from "@/components/screens/leave-screen";
import { SalaryScreen } from "@/components/screens/salary-screen";
import { ReportScreen } from "@/components/screens/report-screen";
import { KpiScreen } from "@/components/screens/kpi-screen";
import { RecognitionScreen } from "@/components/screens/recognition-screen";
import { PayrollScreen } from "@/components/screens/payroll-screen";
import { TrainingScreen } from "@/components/screens/training-screen";
import { PermissionsScreen } from "@/components/screens/permissions-screen";
import { ConfigScreen } from "@/components/screens/config-screen";
import { FormulaScreen } from "@/components/screens/formula-screen";
import { AuditScreen } from "@/components/screens/audit-screen";
import { AccountScreen } from "@/components/screens/account-screen";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState("framework");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);

  // Giữ splash cyberpunk tối thiểu ~1.4s mỗi lần tải/reload trang để thấy rõ hiệu ứng.
  const [minBoot, setMinBoot] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setMinBoot(false), 1400);
    return () => clearTimeout(t);
  }, []);

  function navigate(next: string, id?: string) {
    setScreen(next);
    if (id) setSelectedEmployeeId(id);
  }

  if (isLoading || minBoot) {
    return <CyberLoader />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Trên điện thoại: ứng dụng di động 5 tab (chấm công selfie, nghỉ phép, lương…).
  if (isMobile) {
    return <MobileApp />;
  }

  function renderScreen() {
    switch (screen) {
      case "framework":
        return <FrameworkScreen onNavigate={navigate} />;
      case "dashboard":
        return <DashboardScreen />;
      case "employees":
        return <EmployeesScreen onNavigate={navigate} />;
      case "employee-detail":
        return <EmployeeDetailScreen employeeId={selectedEmployeeId} onNavigate={navigate} />;
      case "org":
        return <OrgScreen onNavigate={navigate} />;
      case "attendance":
        return <AttendanceScreen />;
      case "leave":
        return <LeaveScreen />;
      case "salary":
        return <SalaryScreen />;
      case "report":
        return <ReportScreen />;
      case "kpi":
        return <KpiScreen />;
      case "recognition":
        return <RecognitionScreen />;
      case "payroll":
        return <PayrollScreen />;
      case "training":
        return <TrainingScreen />;
      case "permissions":
        return <PermissionsScreen />;
      case "config":
        return <ConfigScreen />;
      case "formula":
        return <FormulaScreen onNavigate={navigate} />;
      case "audit":
        return <AuditScreen />;
      case "account":
        return <AccountScreen />;
      default:
        return <FrameworkScreen onNavigate={navigate} />;
    }
  }

  return (
    <AppShell currentScreen={screen} onNavigate={navigate}>
      {renderScreen()}
    </AppShell>
  );
}
