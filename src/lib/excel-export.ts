"use client";

/**
 * Styled Excel export. Produces a real .xls file that Excel opens with full
 * corporate styling — logo, coloured header, borders, zebra rows, column
 * widths and number formats — by emitting an Office-flavoured HTML table.
 * No heavy dependency, works with the static export build.
 */

export interface ExcelColumn {
  label: string;
  align?: "left" | "right" | "center";
  /** money → "#,##0 ₫"; int → "#,##0"; text keeps as-is. Default: auto by value type. */
  format?: "money" | "int" | "text";
  width?: number; // px
}

export interface ExcelExportOptions {
  filename: string;
  title: string;
  meta?: string[]; // e.g. ["Kỳ: 06/2026", "Ngày xuất: 18/07/2026"]
  columns: ExcelColumn[];
  rows: (string | number)[][];
  logoDataUrl?: string | null;
}

const NAVY = "#0f2f5a";
const HEADER_BG = "#1a5276";
const ZEBRA = "#f4f7fb";
const BORDER = "#c9d4e0";

let _logoCache: string | null | undefined;

/** Load /logo.png, downscale to keep the file small, return a data URL. */
export async function getLogoDataUrl(maxHeight = 64): Promise<string | null> {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const dataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = Math.min(1, maxHeight / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = "/logo.png";
    });
    _logoCache = dataUrl;
    return dataUrl;
  } catch {
    _logoCache = null;
    return null;
  }
}

function esc(v: string | number): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function msoFormat(fmt: "money" | "int" | "text"): string {
  if (fmt === "money") return "mso-number-format:'#,##0\\ \\₫';";
  if (fmt === "int") return "mso-number-format:'#,##0';";
  return "mso-number-format:'\\@';"; // force text (keeps leading zeros, phone codes)
}

export function buildExcelHtml(opts: ExcelExportOptions): string {
  const { title, meta = [], columns, rows, logoDataUrl } = opts;
  const colCount = columns.length;

  const headCells = columns
    .map(
      (c) =>
        `<th style="background:${HEADER_BG};color:#fff;font-weight:bold;border:1px solid ${NAVY};padding:6px 8px;text-align:${c.align ?? "left"};white-space:nowrap;${c.width ? `width:${c.width}px;` : ""}">${esc(c.label)}</th>`,
    )
    .join("");

  const bodyRows = rows
    .map((row, i) => {
      const bg = i % 2 === 1 ? `background:${ZEBRA};` : "";
      const cells = columns
        .map((c, j) => {
          const raw = row[j];
          const isNum = typeof raw === "number";
          const align = c.align ?? (isNum ? "right" : "left");
          const fmt: "money" | "int" | "text" = c.format ?? (isNum ? "int" : "text");
          return `<td style="border:1px solid ${BORDER};padding:4px 8px;text-align:${align};${bg}${msoFormat(fmt)}">${esc(raw)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const metaRows = meta
    .map(
      (m) =>
        `<tr><td colspan="${colCount}" style="padding:1px 8px;font-size:10pt;color:#555;">${esc(m)}</td></tr>`,
    )
    .join("");

  const logoCell = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:44px;" />`
    : "";

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<style>
  table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; }
  .company { font-size: 13pt; font-weight: bold; color: ${NAVY}; }
  .title { font-size: 15pt; font-weight: bold; color: ${NAVY}; }
</style>
</head>
<body>
<table>
  <tr>
    <td colspan="${colCount}" style="padding:6px 8px;">
      <table style="border:none;"><tr>
        <td style="border:none;padding-right:10px;">${logoCell}</td>
        <td style="border:none;">
          <div class="company">CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY</div>
          <div style="font-size:9pt;color:#888;">Hệ thống quản trị nhân sự HRM</div>
        </td>
      </tr></table>
    </td>
  </tr>
  <tr><td colspan="${colCount}" class="title" style="padding:6px 8px 2px;">${esc(title)}</td></tr>
  ${metaRows}
  <tr><td colspan="${colCount}" style="height:6px;"></td></tr>
  <thead><tr>${headCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;
}

export function exportStyledExcel(opts: ExcelExportOptions): void {
  const html = buildExcelHtml(opts);
  const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename.endsWith(".xls") ? opts.filename : `${opts.filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
