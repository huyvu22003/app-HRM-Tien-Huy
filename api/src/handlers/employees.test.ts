import { describe, expect, it } from "vitest";
import { normalizeEmploymentState } from "./employees";

describe("employee resignation state", () => {
  it("marks an employee resigned when a resignation date is entered", () => {
    expect(normalizeEmploymentState({ status: "Đang làm việc", resignDate: "2026-11-16" }))
      .toEqual({ status: "Nghỉ việc", resignDate: "2026-11-16" });
  });

  it("adds a date when resigned status is selected", () => {
    expect(normalizeEmploymentState({ status: "Nghỉ việc", today: "2026-11-17" }))
      .toEqual({ status: "Nghỉ việc", resignDate: "2026-11-17" });
  });

  it("returns to active when the resignation date is cleared", () => {
    expect(normalizeEmploymentState({ resignDate: null }))
      .toEqual({ status: "Đang làm việc", resignDate: null });
  });
});
