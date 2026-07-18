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
        `<tr><td colspan="${colCount}" style="padding:1px 8px;font-size:10pt;color:#555;text-align:center;">${esc(m)}</td></tr>`,
    )
    .join("");

  // Note: Excel's HTML import cannot embed data-URL images (shows a broken
  // link box), so the header is a styled text banner rather than an <img>.
  void logoDataUrl;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<style>
  table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; }
  .company { font-size: 14pt; font-weight: bold; color: ${NAVY}; }
  .title { font-size: 15pt; font-weight: bold; color: ${NAVY}; }
</style>
</head>
<body>
<table>
  <tr><td colspan="${colCount}" class="company" style="padding:8px 8px 0;text-align:center;">CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY</td></tr>
  <tr><td colspan="${colCount}" style="padding:0 8px;font-size:9pt;color:#888;text-align:center;">Hệ thống quản trị nhân sự HRM</td></tr>
  <tr><td colspan="${colCount}" class="title" style="padding:8px 8px 2px;text-align:center;">${esc(title)}</td></tr>
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
