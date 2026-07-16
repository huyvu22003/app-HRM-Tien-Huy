"use client";

import { Award, Clock } from "lucide-react";

export function RecognitionScreen() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-[var(--color-border)] bg-white p-[18px]">
        <div className="mb-2 text-[13px] font-semibold text-[var(--color-text-primary)]">Khen thưởng nhân viên</div>
        <p className="text-[12.5px] text-[var(--color-text-muted)]">
          Ghi nhận thành tích, xét thưởng nóng và vinh danh nhân viên xuất sắc theo tháng/quý.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[var(--color-border)] bg-white py-16 text-center">
        <Award size={32} className="text-[var(--color-text-lighter)]" />
        <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">Chưa có đề xuất khen thưởng</div>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-light)]">
          <Clock size={13} /> Phân hệ sẽ khả dụng trong giai đoạn tiếp theo
        </div>
      </div>
    </div>
  );
}
