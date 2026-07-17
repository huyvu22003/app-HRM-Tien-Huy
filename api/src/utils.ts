// Generic helpers shared across handlers.

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function error(message: string, status = 400, headers: Record<string, string> = {}): Response {
  return json({ error: message }, status, headers);
}

export function getParams(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function paginate<T>(items: T[], page = 1, pageSize = 20): { data: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return { data, total, page: safePage, pageSize, totalPages };
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function parseIdFromPath(pathname: string, prefix: string): string | null {
  const rest = pathname.slice(prefix.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!rest) return null;
  return rest.split("/")[0] ?? null;
}
