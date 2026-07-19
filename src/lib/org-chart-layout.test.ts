import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildElbowPath,
  getResponsiveColumnCount,
} from "./org-chart-layout.ts";

describe("buildElbowPath", () => {
  it("routes through the midpoint between the source and target", () => {
    assert.equal(
      buildElbowPath({ x: 100, y: 40 }, { x: 260, y: 140 }),
      "M 100 40 V 90 H 260 V 140",
    );
  });
});

describe("getResponsiveColumnCount", () => {
  it("fits between one and four complete card columns", () => {
    assert.equal(getResponsiveColumnCount(420, 220, 16), 1);
    assert.equal(getResponsiveColumnCount(760, 220, 16), 3);
    assert.equal(getResponsiveColumnCount(1200, 220, 16), 4);
  });

  it("returns one column for invalid dimensions", () => {
    assert.equal(getResponsiveColumnCount(Number.NaN, 220, 16), 1);
    assert.equal(getResponsiveColumnCount(760, 0, 16), 1);
    assert.equal(getResponsiveColumnCount(760, 220, -220), 1);
  });
});
