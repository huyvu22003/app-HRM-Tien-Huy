export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface KeyedChartRect {
  key: string;
  rect: ChartRect;
}

export interface KeyedChartPath {
  key: string;
  d: string;
}

export function buildElbowPath(source: ChartPoint, target: ChartPoint): string {
  const midpointY = source.y / 2 + target.y / 2;
  return `M ${source.x} ${source.y} V ${midpointY} H ${target.x} V ${target.y}`;
}

export function getResponsiveColumnCount(
  width: number,
  cardWidth: number,
  gap: number,
): number {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(cardWidth) ||
    !Number.isFinite(gap) ||
    width < 0 ||
    cardWidth <= 0 ||
    gap < 0
  ) {
    return 1;
  }

  const columnCount = Math.floor((width + gap) / (cardWidth + gap));
  return Math.min(4, Math.max(1, columnCount));
}

export function buildRowAwareConnectorPaths(
  source: ChartRect,
  targets: KeyedChartRect[],
): KeyedChartPath[] {
  if (targets.length === 0) return [];

  const sorted = [...targets].sort(
    (a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left,
  );
  const rows: KeyedChartRect[][] = [];
  for (const target of sorted) {
    const row = rows.at(-1);
    if (!row || Math.abs(row[0].rect.top - target.rect.top) > 1) rows.push([target]);
    else row.push(target);
  }

  const sourceX = source.left + source.width / 2;
  const sourceBottom = source.top + source.height;
  const trunkX = Math.max(6, Math.min(...targets.map((target) => target.rect.left)) - 12);
  const firstBusY = (sourceBottom + rows[0][0].rect.top) / 2;
  const busByKey = new Map<string, number>();
  let previousBottom = sourceBottom;
  for (const row of rows) {
    const rowTop = row[0].rect.top;
    const busY = (previousBottom + rowTop) / 2;
    row.forEach((target) => busByKey.set(target.key, busY));
    previousBottom = Math.max(
      ...row.map((target) => target.rect.top + target.rect.height),
    );
  }

  return targets.map((target) => {
    const targetX = target.rect.left + target.rect.width / 2;
    const busY = busByKey.get(target.key) ?? firstBusY;
    return {
      key: target.key,
      d: `M ${sourceX} ${sourceBottom} V ${firstBusY} H ${trunkX} V ${busY} H ${targetX} V ${target.rect.top}`,
    };
  });
}
