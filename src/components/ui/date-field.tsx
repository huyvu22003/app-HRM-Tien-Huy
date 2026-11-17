"use client";

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
  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        disabled={disabled}
        value={value ? formatDate(value) : ""}
        placeholder={placeholder}
        tabIndex={-1}
        aria-hidden
        className={cn(className, "pointer-events-none pr-8")}
      />
      <Calendar
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-lighter)]"
      />
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
