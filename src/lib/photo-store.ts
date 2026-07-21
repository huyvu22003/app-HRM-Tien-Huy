"use client";

/**
 * Per-employee avatar photos, persisted to localStorage as data URLs so the
 * chosen photo shows up everywhere an avatar is rendered (detail header,
 * employee list, hover card, org chart) and survives reloads.
 *
 * When the real backend + R2 storage is deployed, replace get/set with the
 * upload API; the read sites already fall back gracefully.
 */

const KEY = "hrm_employee_photos";

type PhotoMap = Record<string, string>;

function readMap(): PhotoMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PhotoMap;
  } catch {
    /* ignore */
  }
  return {};
}

export function getEmployeePhoto(id: number | string): string | null {
  return readMap()[String(id)] ?? null;
}

export function getEmployeePhotos(ids: ReadonlyArray<number | string>): Map<number | string, string | null> {
  const photos = readMap();
  return new Map(ids.map((id) => [id, photos[String(id)] ?? null]));
}

export function setEmployeePhoto(id: number | string, dataUrl: string | null): void {
  try {
    const map = readMap();
    if (dataUrl) map[String(id)] = dataUrl;
    else delete map[String(id)];
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore (quota / unavailable) */
  }
}
