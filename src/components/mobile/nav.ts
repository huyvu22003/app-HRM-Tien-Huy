export type MobileScreen =
  | "home"
  | "leave"
  | "salary"
  | "profile"
  | "checkin"
  | "createLeave"
  | "approvals"
  | "report"
  | "kpi"
  | "notifications";

export type Go = (s: MobileScreen) => void;

/** Kỳ hiện tại dạng YYYY-MM. */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayLabel(): string {
  const d = new Date();
  const wd = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][d.getDay()];
  return `${wd}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
