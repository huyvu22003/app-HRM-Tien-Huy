export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
}

export function formatMoney(n: number): string {
  if (Number.isNaN(n) || n === undefined || n === null) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))} ₫`;
}

export function formatDate(date: string | undefined | null): string {
  if (!date) return "-";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function seededRandom(seed: string, min: number, max: number): number {
  const h = hashName(seed);
  return min + (h % (max - min + 1));
}
