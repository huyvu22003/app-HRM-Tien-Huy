export interface ChartPoint {
  x: number;
  y: number;
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
