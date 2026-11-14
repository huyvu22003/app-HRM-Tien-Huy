import { describe, expect, it } from "vitest";
import { isSelfieEnabledEmployeeCode } from "./checkin";

describe("selfie check-in account activation", () => {
  it("enables Trần Hoài Ân employee code 0187", () => {
    expect(isSelfieEnabledEmployeeCode("0187")).toBe(true);
    expect(isSelfieEnabledEmployeeCode(" 0187 ")).toBe(true);
  });

  it("keeps other employee accounts disabled", () => {
    expect(isSelfieEnabledEmployeeCode("0186")).toBe(false);
    expect(isSelfieEnabledEmployeeCode(null)).toBe(false);
  });
});
