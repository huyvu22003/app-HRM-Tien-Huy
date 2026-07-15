"use client";

import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOGIN_THEMES, LOGIN_DEFAULT, DEFAULT_CFG } from "@/lib/data/config";

const RULE_GROUP_LABEL: Record<string, string> = {
  leave: "Nghỉ phép",
  attendance: "Chấm công",
  insurance: "Bảo hiểm",
  tax: "Thuế TNCN",
};

const RULE_FIELD_LABEL: Record<string, string> = {
  annualDays: "Số ngày phép năm cơ bản",
  maxCarryOver: "Số ngày phép được chuyển kỳ tối đa",
  probationEligibleMonths: "Số tháng thử việc trước khi hưởng phép",
  workStart: "Giờ vào ca",
  workEnd: "Giờ tan ca",
  lateGraceMinutes: "Số phút cho phép đi trễ",
  lunchBreakMinutes: "Thời gian nghỉ trưa (phút)",
  standardWorkDaysPerMonth: "Công chuẩn mỗi tháng",
  bhxhEmployeeRate: "BHXH (người lao động)",
  bhytEmployeeRate: "BHYT (người lao động)",
  bhtnEmployeeRate: "BHTN (người lao động)",
  bhxhEmployerRate: "BHXH (doanh nghiệp)",
  bhytEmployerRate: "BHYT (doanh nghiệp)",
  bhtnEmployerRate: "BHTN (doanh nghiệp)",
  personalDeduction: "Giảm trừ bản thân",
  dependentDeduction: "Giảm trừ mỗi người phụ thuộc",
};

export function ConfigScreen() {
  const [appName, setAppName] = useState(LOGIN_DEFAULT.appName);
  const [company, setCompany] = useState(LOGIN_DEFAULT.company);
  const [tagline, setTagline] = useState(LOGIN_DEFAULT.tagline);
  const [theme, setTheme] = useState(LOGIN_DEFAULT.theme);
  const [blur, setBlur] = useState(20);
  const [dim, setDim] = useState(40);
  const [showDemo, setShowDemo] = useState(LOGIN_DEFAULT.showDemoAccounts);
  const [showStats, setShowStats] = useState(true);

  const [rules, setRules] = useState(DEFAULT_CFG);

  function updateRule(group: keyof typeof DEFAULT_CFG, field: string, value: string) {
    const isTimeField = field === "workStart" || field === "workEnd";
    setRules((r) => ({
      ...r,
      [group]: { ...r[group], [field]: isTimeField ? value : Number(value) },
    }));
  }

  function reset() {
    setAppName(LOGIN_DEFAULT.appName);
    setCompany(LOGIN_DEFAULT.company);
    setTagline(LOGIN_DEFAULT.tagline);
    setTheme(LOGIN_DEFAULT.theme);
    setShowDemo(LOGIN_DEFAULT.showDemoAccounts);
    setRules(DEFAULT_CFG);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-4 text-[13px] font-semibold text-[var(--color-text-primary)]">Trang đăng nhập</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Tên ứng dụng
            </label>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Tên công ty
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Khẩu hiệu
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--color-text-secondary)]">
            Màu chủ đề
          </label>
          <div className="flex gap-2">
            {LOGIN_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={t.name}
                style={{ background: t.primary }}
                className={cn(
                  "h-8 w-8 rounded-full border-2",
                  theme === t.id ? "border-[var(--color-text-primary)]" : "border-transparent"
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 flex justify-between text-[12px] font-medium text-[var(--color-text-secondary)]">
              Độ mờ nền (blur) <span>{blur}px</span>
            </label>
            <input
              type="range"
              min={0}
              max={40}
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1.5 flex justify-between text-[12px] font-medium text-[var(--color-text-secondary)]">
              Độ tối overlay <span>{dim}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={dim}
              onChange={(e) => setDim(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} />
            Hiển thị tài khoản demo
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} />
            Hiển thị thống kê 81/22/4
          </label>
        </div>
      </div>

      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-4 text-[13px] font-semibold text-[var(--color-text-primary)]">Quy tắc hệ thống</div>
        <div className="flex flex-col gap-5">
          {(Object.keys(rules) as (keyof typeof DEFAULT_CFG)[]).map((group) => (
            <div key={group}>
              <div className="mb-2 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                {RULE_GROUP_LABEL[group] ?? group}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {Object.entries(rules[group]).map(([field, val]) => (
                  <div key={field}>
                    <label className="mb-1.5 block text-[11.5px] text-[var(--color-text-muted)]">
                      {RULE_FIELD_LABEL[field] ?? field}
                    </label>
                    <input
                      type={typeof val === "number" ? "number" : "text"}
                      step={typeof val === "number" && val < 1 ? 0.001 : 1}
                      value={val as string | number}
                      onChange={(e) => updateRule(group, field, e.target.value)}
                      className="h-10 w-full rounded-[8px] border border-[var(--color-border)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-[12.5px] text-[var(--color-text-secondary)] hover:bg-white"
        >
          <RotateCcw size={14} /> Đặt lại
        </button>
        <button className="flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[var(--color-accent-hover)]">
          <Save size={14} /> Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
