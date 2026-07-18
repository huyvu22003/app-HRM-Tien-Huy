"use client";

import ExcelJS from "exceljs";

/**
 * Styled Excel (.xlsx) export via exceljs — real workbook with an embedded
 * company logo, centered title banner, coloured header, borders, zebra rows,
 * column widths and number formats. Opens with no "format mismatch" warning.
 */

export interface ExcelColumn {
  label: string;
  align?: "left" | "right" | "center";
  format?: "money" | "int" | "text";
  width?: number; // px
}

export interface ExcelExportOptions {
  filename: string;
  title: string;
  meta?: string[];
  columns: ExcelColumn[];
  rows: (string | number)[][];
}

const NAVY = "FF0F2F5A";
const HEADER_BG = "FF1A5276";
const ZEBRA = "FFF4F7FB";
const BORDER = "FFC9D4E0";

let _logoCache: { base64: string; width: number; height: number } | null | undefined;

async function getLogo(maxWidth = 150): Promise<{ base64: string; width: number; height: number } | null> {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const result = await new Promise<{ base64: string; width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ base64: dataUrl.replace(/^data:image\/png;base64,/, ""), width: w, height: h });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = "/logo.png";
    });
    _logoCache = result;
    return result;
  } catch {
    _logoCache = null;
    return null;
  }
}

function numFmt(format: "money" | "int" | "text" | undefined, isNum: boolean): string | undefined {
  const f = format ?? (isNum ? "int" : "text");
  if (f === "money") return '#,##0" ₫"';
  if (f === "int") return "#,##0";
  return undefined;
}

export async function exportStyledExcel(opts: ExcelExportOptions): Promise<void> {
  const { title, meta = [], columns, rows, filename } = opts;
  const colCount = columns.length;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Bảng dữ liệu", { views: [{ showGridLines: false }] });

  ws.columns = columns.map((c) => ({ width: c.width ? c.width / 7 : 18 }));

  const logo = await getLogo();
  if (logo) {
    const id = wb.addImage({ base64: logo.base64, extension: "png" });
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: logo.width, height: logo.height } });
  }

  const centerMerged = (rowIdx: number, text: string, opts2: { size?: number; bold?: boolean; color?: string }) => {
    ws.mergeCells(rowIdx, 1, rowIdx, colCount);
    const cell = ws.getCell(rowIdx, 1);
    cell.value = text;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { name: "Calibri", size: opts2.size ?? 11, bold: opts2.bold, color: { argb: opts2.color ?? "FF333333" } };
  };

  // Header banner (rows tall enough to clear the logo)
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 16;
  centerMerged(1, "CÔNG TY TNHH CƠ KHÍ KHUÔN MẪU TIẾN HUY", { size: 14, bold: true, color: NAVY });
  centerMerged(2, "Hệ thống quản trị nhân sự HRM", { size: 9, color: "FF888888" });
  centerMerged(3, title, { size: 15, bold: true, color: NAVY });

  let r = 4;
  for (const m of meta) {
    centerMerged(r, m, { size: 10, color: "FF555555" });
    r++;
  }
  r++; // spacer row

  // Header row
  const headerRow = ws.getRow(r);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
    cell.alignment = { horizontal: c.align ?? "left", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: NAVY } },
      bottom: { style: "thin", color: { argb: NAVY } },
      left: { style: "thin", color: { argb: NAVY } },
      right: { style: "thin", color: { argb: NAVY } },
    };
  });
  headerRow.height = 20;
  const headerRowIdx = r;
  r++;

  // Data rows
  rows.forEach((row, ri) => {
    const dataRow = ws.getRow(r);
    const zebra = ri % 2 === 1;
    columns.forEach((c, ci) => {
      const raw = row[ci];
      const isNum = typeof raw === "number";
      const cell = dataRow.getCell(ci + 1);
      cell.value = raw;
      cell.alignment = { horizontal: c.align ?? (isNum ? "right" : "left"), vertical: "middle" };
      const fmt = numFmt(c.format, isNum);
      if (fmt) cell.numFmt = fmt;
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
      cell.font = { size: 10 };
    });
    r++;
  });

  // Freeze header + title so it stays visible while scrolling
  ws.views = [{ state: "frozen", ySplit: headerRowIdx, showGridLines: false }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
