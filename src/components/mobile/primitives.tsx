"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nền thẻ trắng bo góc 16px, viền nhạt — khối cơ bản của giao diện mobile. */
export function MCard({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cn("rounded-[16px] border border-[var(--color-border)] bg-white", className)}>
      {children}
    </div>
  );
}

type Tone = "accent" | "success" | "warning" | "danger" | "maternity" | "muted";

const TONE_BG: Record<Tone, string> = {
  accent: "bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] text-[var(--color-accent)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  maternity: "bg-[var(--color-maternity-bg)] text-[var(--color-maternity)]",
  muted: "bg-[var(--color-page-bg)] text-[var(--color-text-muted)]",
};

/** Nhãn trạng thái dạng pill (tint nền + chữ cùng tông). */
export function MBadge({ tone = "muted", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[20px] px-2.5 py-1 text-[11px] font-semibold", TONE_BG[tone], className)}>
      {children}
    </span>
  );
}

/** Header dính trên. Có thể là tiêu đề màn gốc hoặc thanh có nút quay lại. */
export function MHeader({
  title,
  subtitle,
  onBack,
  right,
  plain = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white px-4 pb-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-[var(--color-page-bg)] text-[var(--color-text-secondary)]">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className={cn("truncate font-extrabold text-[var(--color-text-primary)]", plain ? "text-[17px]" : "text-[19px]")}>{title}</div>
          {subtitle && <div className="truncate text-[12px] text-[var(--color-text-muted)]">{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

/** Nút chính (accent) chiều rộng đầy, cỡ lớn dễ chạm. */
export function MButton({
  children,
  onClick,
  disabled,
  tone = "accent",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "accent" | "success" | "danger" | "ghost";
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: "bg-[var(--color-accent)] text-white",
    success: "bg-[var(--color-success)] text-white",
    danger: "bg-[var(--color-danger)] text-white",
    ghost: "border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-bold disabled:opacity-50",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export const mono = "font-[family-name:var(--font-mono)]";

/** Vùng cuộn nội dung dưới header, chừa chỗ cho thanh tab dưới. */
export function MBody({ children, className, pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={cn("flex-1 overflow-y-auto", pad && "px-4 py-4", className)} style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
      {children}
    </div>
  );
}
