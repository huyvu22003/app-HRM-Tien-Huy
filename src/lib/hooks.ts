"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = [],
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!fetcher);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);

  const load = useCallback(() => {
    if (!fetcher) {
      setData(null);
      setIsLoading(false);
      return;
    }
    const v = ++version.current;
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (v === version.current) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (v === version.current) {
          setError(err?.message || "Đã xảy ra lỗi");
          setIsLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}

export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setIsLoading(false);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
        setError(msg);
        setIsLoading(false);
        throw err;
      }
    },
    [fn],
  );

  return { mutate, isLoading, error };
}
