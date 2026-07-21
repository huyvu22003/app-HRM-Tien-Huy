import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildElbowPath,
  buildRowAwareConnectorPaths,
  getResponsiveColumnCount,
} from "./org-chart-layout.ts";

describe("buildElbowPath", () => {
  it("routes through the midpoint between the source and target", () => {
    assert.equal(
      buildElbowPath({ x: 100, y: 40 }, { x: 260, y: 140 }),
      "M 100 40 V 90 H 260 V 140",
    );
  });

  it("keeps the midpoint finite for large finite coordinates", () => {
    const path = buildElbowPath(
      { x: 100, y: Number.MAX_VALUE },
      { x: 260, y: Number.MAX_VALUE },
    );

    assert.equal(
      path,
      `M 100 ${Number.MAX_VALUE} V ${Number.MAX_VALUE} H 260 V ${Number.MAX_VALUE}`,
    );
    assert.equal(path.includes("Infinity"), false);
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

describe("buildRowAwareConnectorPaths", () => {
  it("routes later rows through the gap beside earlier cards", () => {
    const paths = buildRowAwareConnectorPaths(
      { left: 340, top: 20, width: 240, height: 60 },
      [
        { key: "a", rect: { left: 40, top: 130, width: 200, height: 60 } },
        { key: "b", rect: { left: 260, top: 130, width: 200, height: 60 } },
        { key: "c", rect: { left: 40, top: 206, width: 200, height: 60 } },
      ],
    );

    assert.equal(paths.length, 3);
    assert.equal(paths[2].key, "c");
    assert.equal(paths[2].d, "M 460 80 V 105 H 28 V 198 H 140 V 206");
  });
});
