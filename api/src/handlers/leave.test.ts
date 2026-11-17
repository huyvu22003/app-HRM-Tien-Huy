import { describe, expect, it } from "vitest";
import { getLeaveApprovalStep } from "./leave";

describe("leave approval permissions", () => {
  it("allows only the direct manager to perform level-one approval", () => {
    expect(getLeaveApprovalStep("lead", 10, 10, "pending")).toBe(1);
    expect(getLeaveApprovalStep("lead", 11, 10, "pending")).toBeNull();
    expect(getLeaveApprovalStep("lead", 10, 10, "approved_l1")).toBeNull();
  });

  it("enforces team lead, HR, then director approval in order", () => {
    expect(getLeaveApprovalStep("hr", 20, 10, "pending")).toBeNull();
    expect(getLeaveApprovalStep("hr", 20, 10, "approved_l1")).toBe(2);
    expect(getLeaveApprovalStep("director", null, 10, "approved_l1")).toBeNull();
    expect(getLeaveApprovalStep("director", null, 10, "approved_l2")).toBe(3);
    expect(getLeaveApprovalStep("super", null, null, "pending")).toBeNull();
    expect(getLeaveApprovalStep("super", null, null, "approved_l2")).toBe(3);
  });

  it("does not allow staff or already processed requests", () => {
    expect(getLeaveApprovalStep("staff", 30, 30, "pending")).toBeNull();
    expect(getLeaveApprovalStep("hr", 20, 10, "approved")).toBeNull();
    expect(getLeaveApprovalStep("director", 20, 10, "rejected")).toBeNull();
  });
});
