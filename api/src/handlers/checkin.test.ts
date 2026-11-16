import { describe, expect, it } from "vitest";
import { isSelfieEnabledEmployeeCode, validateFaceProof } from "./checkin";

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

describe("selfie face proof", () => {
  it("accepts only matching live faces with a blink", () => {
    expect(validateFaceProof({ faceSimilarity: 0.72, faceReal: 0.81, faceLive: 0.76, blinkVerified: true })).toBeNull();
  });

  it("rejects a different face and photo replay", () => {
    expect(validateFaceProof({ faceSimilarity: 0.42, faceReal: 0.9, faceLive: 0.9, blinkVerified: true })).toContain("không khớp");
    expect(validateFaceProof({ faceSimilarity: 0.72, faceReal: 0.2, faceLive: 0.2, blinkVerified: false })).toContain("khuôn mặt trực tiếp");
  });
});
