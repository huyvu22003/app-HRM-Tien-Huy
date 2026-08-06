"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

/**
 * Ô nhập ngày luôn hiển thị định dạng Việt Nam dd/mm/yyyy, không phụ thuộc
 * ngôn ngữ trình duyệt (input[type=date] gốc hiển thị theo locale của Chrome
 * nên máy tiếng Anh ra mm/dd/yyyy gây đọc nhầm). Giá trị vẫn là ISO yyyy-mm-dd.
 *
 * Kỹ thuật: ô text chỉ đọc hiển thị dd/mm/yyyy đè lên một input[type=date] trong
 * suốt; bấm vào sẽ mở lịch gốc của trình duyệt qua showPicker().
 */
export function DateField({
  value,
  onChange,
  className,
  placeholder = "dd/mm/yyyy",
  disabled = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);

  function open() {
    if (disabled) return;
    const el = nativeRef.current;
    if (!el) return;
    const withPicker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof withPicker.showPicker === "function") {
      try {
        withPicker.showPicker();
        return;
      } catch {
        /* fallback focus below */
      }
    }
    el.focus();
    el.click();
  }

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        disabled={disabled}
        value={value ? formatDate(value) : ""}
        placeholder={placeholder}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className={cn(className, "cursor-pointer pr-8")}
      />
      <Calendar
        size={14}
        onClick={open}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]"
      />
      <input
        ref={nativeRef}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-3 h-0 w-0 opacity-0"
      />
    </div>
  );
}
