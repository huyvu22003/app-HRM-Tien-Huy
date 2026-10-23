import { describe, expect, it } from "vitest";
import { inferAccountRole } from "./accounts";

describe("inferAccountRole", () => {
  it("assigns HR by department", () => {
    expect(inferAccountRole({ department_name: "Nhân Sự", position: "Chuyên viên", level: null })).toBe("hr");
  });

  it("assigns lead to management positions", () => {
    expect(inferAccountRole({ department_name: "Sản xuất", position: "Tổ trưởng", level: null })).toBe("lead");
    expect(inferAccountRole({ department_name: "Kinh Doanh", position: "Nhân viên", level: "Trưởng phòng" })).toBe("lead");
  });

  it("defaults regular employees to staff", () => {
    expect(inferAccountRole({ department_name: "Kho", position: "Nhân viên", level: "Bậc 2" })).toBe("staff");
  });
});
