"use client";

import { useEffect, useState } from "react";

/**
 * Trả về true khi màn hình rộng dưới `breakpoint` (mặc định 768px — cỡ máy tính
 * bảng dọc trở xuống). An toàn SSR: lần render đầu trả về null (chưa biết) để
 * tránh nhấp nháy giữa layout desktop/mobile khi hydrate.
 */
export function useIsMobile(breakpoint = 768): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
