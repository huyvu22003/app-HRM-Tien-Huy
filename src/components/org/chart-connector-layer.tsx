"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";

export interface ConnectorEdge {
  from: string;
  to: string;
}

export interface ConnectorPath extends ConnectorEdge {
  d: string;
}

type Point = { x: number; y: number };

export function buildElbowPath(from: Point, to: Point): string {
  const middleY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} V ${middleY} H ${to.x} V ${to.y}`;
}

export function useChartConnectors(edges: ConnectorEdge[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const callbacksRef = useRef(new Map<string, RefCallback<HTMLElement>>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const edgesRef = useRef(edges);
  const [paths, setPaths] = useState<ConnectorPath[]>([]);

  const measure = useCallback(() => {
    if (!mountedRef.current) return;

    const container = containerRef.current;
    if (!container) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextPaths = edgesRef.current.flatMap((edge) => {
      const fromNode = nodesRef.current.get(edge.from);
      const toNode = nodesRef.current.get(edge.to);
      if (!fromNode || !toNode) return [];

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const from = {
        x: fromRect.left - containerRect.left + fromRect.width / 2,
        y: fromRect.bottom - containerRect.top,
      };
      const to = {
        x: toRect.left - containerRect.left + toRect.width / 2,
        y: toRect.top - containerRect.top,
      };

      return [{ ...edge, d: buildElbowPath(from, to) }];
    });

    setPaths((current) => {
      if (
        current.length === nextPaths.length &&
        current.every(
          (path, index) =>
            path.from === nextPaths[index].from &&
            path.to === nextPaths[index].to &&
            path.d === nextPaths[index].d,
        )
      ) {
        return current;
      }
      return nextPaths;
    });
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (!mountedRef.current) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }, [measure]);

  const registerNode = useCallback(
    (id: string): RefCallback<HTMLElement> => {
      const existing = callbacksRef.current.get(id);
      if (existing) return existing;

      const callback: RefCallback<HTMLElement> = (node) => {
        const previous = nodesRef.current.get(id);
        if (previous === node) {
          scheduleMeasure();
          return;
        }

        if (previous) observerRef.current?.unobserve(previous);
        if (node) {
          nodesRef.current.set(id, node);
          observerRef.current?.observe(node);
        } else {
          nodesRef.current.delete(id);
        }
        scheduleMeasure();
      };
      callbacksRef.current.set(id, callback);
      return callback;
    },
    [scheduleMeasure],
  );

  useLayoutEffect(() => {
    mountedRef.current = true;
    const observer = new ResizeObserver(scheduleMeasure);
    observerRef.current = observer;

    if (containerRef.current) observer.observe(containerRef.current);
    nodesRef.current.forEach((node) => observer.observe(node));
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", scheduleMeasure);
      observer.disconnect();
      observerRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    edgesRef.current = edges;
    scheduleMeasure();
  }, [edges, scheduleMeasure]);

  return { containerRef, registerNode, paths, measure };
}

export function ChartConnectorLayer({ paths }: { paths: ConnectorPath[] }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
    >
      {paths.map((path) => (
        <path
          key={`${path.from}-${path.to}`}
          d={path.d}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
