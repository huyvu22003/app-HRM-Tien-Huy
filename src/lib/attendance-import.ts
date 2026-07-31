"use client";

import ExcelJS from "exceljs";
import type { AttendanceImportRow } from "@/lib/api";

/**
 * Đọc file chấm công. Hỗ trợ 2 loại file:
 *
 * 1) FILE GỐC máy chấm công + HR (2 sheet: "Chấm công" + "tăng ca", lưới giờ/ngày):
 *    Sheet "Chấm công" (giờ công/ngày; "-" nghỉ; "NL" làm lễ):
 *      - Tổng N.C  = Σ(giờ)/8 + số ngày "NL"
 *      - Xăng xe ngày thường = số ngày có công ≥ 4h
 *    Sheet "tăng ca" (giờ OT/ngày; cột có thứ = "CN" là Chủ Nhật):
 *      - OT CN(h)  = Σ giờ các cột Chủ Nhật
 *      - OT NT(h)  = Σ tất cả − OT CN
 *      - OT Lễ(h)  = cột "TC Lể" (nếu có)
 *      - Tiền cơm TC = (buổi OT 2–5h × 25.000) + (buổi OT 1–1.5h × 10.000)
 *      - Xăng xe CN (ngày) = OT CN(h) / 8
 *
 * 2) FILE APP TỰ XUẤT ("Xuất Excel" → sheet "Bảng dữ liệu", các cột tổng đã tính
 *    sẵn): đọc trực tiếp giá trị theo tiêu đề cột (round-trip). Khớp nhân viên
 *    theo "Mã thẻ".
 */

export interface ParsedAttendance {
  period: string; // YYYY-MM
  rows: AttendanceImportRow[];
  warnings: string[];
}

const MEAL_LONG = 25000; // OT 2–5h
const MEAL_SHORT = 10000; // OT 1–1.5h

type CellVal = ExcelJS.CellValue;

function toNum(v: CellVal): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "-") return null;
    // Bỏ ký tự tiền tệ / phân tách nghìn khi đọc lại file app xuất ("1.234 ₫").
    const cleaned = t.replace(/[₫\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    const o = v as { result?: CellVal; text?: string };
    if ("result" in o) return toNum(o.result ?? null);
    if ("text" in o) return toNum(o.text ?? null);
  }
  return null;
}

function toStr(v: CellVal): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return "";
  if (typeof v === "object") {
    const o = v as { result?: CellVal; text?: string; richText?: { text: string }[] };
    if ("richText" in o && o.richText) return o.richText.map((x) => x.text).join("").trim();
    if ("result" in o) return toStr(o.result ?? null);
    if ("text" in o) return (o.text ?? "").trim();
  }
  return "";
}

function toDate(v: CellVal): Date | null {
  if (v instanceof Date) return v;
  if (v && typeof v === "object" && "result" in v && (v as { result?: CellVal }).result instanceof Date) {
    return (v as { result: Date }).result;
  }
  return null;
}

interface SheetShape {
  headerRow: number;
  dayCols: number[];
  nameCol: number;
  period: string;
  year: number;
  month: number;
}

/** Sheet có phải lưới ngày (file gốc) không? — có ≥ 5 ô kiểu ngày trên một hàng. */
function hasDateHeader(ws: ExcelJS.Worksheet): boolean {
  const maxScan = Math.min(14, ws.rowCount || 14);
  for (let r = 1; r <= maxScan; r++) {
    let cnt = 0;
    for (let c = 1; c <= 45; c++) if (toDate(ws.getRow(r).getCell(c).value)) cnt++;
    if (cnt >= 5) return true;
  }
  return false;
}

function analyzeSheet(ws: ExcelJS.Worksheet): SheetShape {
  // Hàng tiêu đề = hàng có nhiều ô kiểu ngày nhất.
  let headerRow = 0;
  let best = 0;
  const maxScan = Math.min(14, ws.rowCount || 14);
  for (let r = 1; r <= maxScan; r++) {
    let cnt = 0;
    for (let c = 1; c <= 45; c++) if (toDate(ws.getRow(r).getCell(c).value)) cnt++;
    if (cnt > best) {
      best = cnt;
      headerRow = r;
    }
  }
  if (!headerRow) throw new Error("Không tìm thấy hàng tiêu đề ngày trong sheet.");

  // Gom các cột ngày; xác định tháng theo số đông (bỏ ngày tràn sang tháng sau).
  const monthCount: Record<string, number> = {};
  const cells: { c: number; d: Date }[] = [];
  for (let c = 1; c <= 60; c++) {
    const d = toDate(ws.getRow(headerRow).getCell(c).value);
    if (d) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthCount[key] = (monthCount[key] || 0) + 1;
      cells.push({ c, d });
    }
  }
  const mode = Object.entries(monthCount).sort((a, b) => b[1] - a[1])[0][0];
  const [yy, mm] = mode.split("-").map(Number);
  const dayCols = cells.filter((x) => x.d.getFullYear() === yy && x.d.getMonth() + 1 === mm).map((x) => x.c);

  // Cột tên = ô chứa "Họ và tên".
  let nameCol = 0;
  for (let r = Math.max(1, headerRow - 2); r <= headerRow; r++) {
    for (let c = 1; c <= 8; c++) {
      if (toStr(ws.getRow(r).getCell(c).value).toLowerCase().includes("họ và tên")) nameCol = c;
    }
  }
  if (!nameCol) nameCol = 2;

  return { headerRow, dayCols, nameCol, period: `${yy}-${String(mm).padStart(2, "0")}`, year: yy, month: mm };
}

const STOP_RE = /người lập|kế toán|giám đốc|phòng ban|tổng cộng|^ngày\b/i;

function isDataName(name: string): boolean {
  return !!name && !STOP_RE.test(name);
}

export async function parseAttendanceWorkbook(
  buf: ArrayBuffer,
  fallbackPeriod?: string,
): Promise<ParsedAttendance> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  // Ưu tiên file gốc: sheet "Chấm công" dạng lưới ngày.
  const ccWs =
    wb.getWorksheet("Chấm công") || wb.worksheets.find((w) => /chấm công/i.test(w.name));
  if (ccWs && hasDateHeader(ccWs)) {
    const tcWs =
      wb.getWorksheet("tăng ca") || wb.worksheets.find((w) => /tăng ca/i.test(w.name));
    return parseRawWorkbook(ccWs, tcWs);
  }

  // Ngược lại: thử đọc bảng app tự xuất ("Bảng dữ liệu").
  const summary = parseSummaryWorkbook(wb, fallbackPeriod);
  if (summary) return summary;

  throw new Error(
    'Không nhận dạng được file. Cần file gốc máy chấm công (có sheet "Chấm công") ' +
      "hoặc file do chính app xuất ra (nút Xuất Excel).",
  );
}

// ---------------------------------------------------------------------------
// (1) FILE GỐC — 2 sheet lưới ngày
// ---------------------------------------------------------------------------
function parseRawWorkbook(
  ccWs: ExcelJS.Worksheet,
  tcWs: ExcelJS.Worksheet | undefined,
): ParsedAttendance {
  const warnings: string[] = [];

  type Agg = {
    name: string;
    actualDays: number;
    gasWeekdayDays: number;
    otWeekday: number;
    otSunday: number;
    otHoliday: number;
    meal: number;
  };
  const map = new Map<string, Agg>();
  const keyOf = (n: string) => n.trim().toLowerCase();
  const get = (name: string): Agg => {
    const k = keyOf(name);
    let a = map.get(k);
    if (!a) {
      a = { name: name.trim(), actualDays: 0, gasWeekdayDays: 0, otWeekday: 0, otSunday: 0, otHoliday: 0, meal: 0 };
      map.set(k, a);
    }
    return a;
  };

  // ---- Sheet Chấm công ----
  const cc = analyzeSheet(ccWs);
  for (let r = cc.headerRow + 2; r <= (ccWs.rowCount || cc.headerRow + 2); r++) {
    const name = toStr(ccWs.getRow(r).getCell(cc.nameCol).value);
    if (!name) continue;
    if (!isDataName(name)) break;
    const a = get(name);
    let nc = 0;
    let gas = 0;
    for (const c of cc.dayCols) {
      const raw = ccWs.getRow(r).getCell(c).value;
      const n = toNum(raw);
      if (n != null) {
        nc += n / 8;
        if (n >= 4) gas += 1;
      } else if (toStr(raw).toUpperCase() === "NL") {
        nc += 1;
        gas += 1;
      }
    }
    a.actualDays = +nc.toFixed(3);
    a.gasWeekdayDays = gas;
  }

  // ---- Sheet tăng ca ----
  const period = cc.period;
  if (tcWs) {
    const tc = analyzeSheet(tcWs);
    // Hàng thứ (2..7, CN) ngay dưới hàng ngày → xác định cột Chủ Nhật.
    const wdRow = tc.headerRow + 1;
    const sundayCols = new Set(
      tc.dayCols.filter((c) => toStr(tcWs.getRow(wdRow).getCell(c).value).toUpperCase() === "CN"),
    );
    // Cột "TC Lể" (OT ngày lễ) nếu có.
    let holidayCol = 0;
    for (let r = Math.max(1, tc.headerRow - 1); r <= tc.headerRow + 1; r++) {
      for (let c = Math.max(...tc.dayCols) + 1; c <= (tcWs.columnCount || 50); c++) {
        if (/lể|lễ/i.test(toStr(tcWs.getRow(r).getCell(c).value))) holidayCol = c;
      }
    }
    for (let r = tc.headerRow + 2; r <= (tcWs.rowCount || tc.headerRow + 2); r++) {
      const name = toStr(tcWs.getRow(r).getCell(tc.nameCol).value);
      if (!name) continue;
      if (!isDataName(name)) break;
      const a = get(name);
      let total = 0;
      let sun = 0;
      let meal25 = 0;
      let meal10 = 0;
      for (const c of tc.dayCols) {
        const n = toNum(tcWs.getRow(r).getCell(c).value);
        if (n == null) continue;
        total += n;
        if (sundayCols.has(c)) sun += n;
        const t = Math.round(n * 2) / 2;
        if (t === 1 || t === 1.5) meal10 += 1;
        else if (t >= 2 && t <= 5) meal25 += 1;
      }
      a.otSunday = +sun.toFixed(2);
      a.otWeekday = +(total - sun).toFixed(2);
      a.otHoliday = holidayCol ? toNum(tcWs.getRow(r).getCell(holidayCol).value) ?? 0 : 0;
      a.meal = meal25 * MEAL_LONG + meal10 * MEAL_SHORT;
    }
  } else {
    warnings.push('Không tìm thấy sheet "tăng ca" — bỏ qua phần tăng ca.');
  }

  const rows: AttendanceImportRow[] = Array.from(map.values()).map((a) => {
    const gasSundayDays = a.otSunday / 8;
    return {
      name: a.name,
      stdDays: 26,
      actualDays: a.actualDays,
      otWeekdayHours: a.otWeekday,
      otSundayHours: a.otSunday,
      otHolidayHours: a.otHoliday,
      overtimeHours: +(a.otWeekday + a.otSunday + a.otHoliday).toFixed(2),
      gasDays: +(a.gasWeekdayDays + gasSundayDays).toFixed(2),
      mealAllowance: a.meal,
    };
  });

  return { period, rows, warnings };
}

// ---------------------------------------------------------------------------
// (2) FILE APP TỰ XUẤT — sheet "Bảng dữ liệu" với cột tổng đã tính sẵn
// ---------------------------------------------------------------------------
type SummaryField =
  | "code"
  | "name"
  | "stdDays"
  | "actualDays"
  | "gasDays"
  | "otWeekdayHours"
  | "otSundayHours"
  | "otHolidayHours"
  | "overtimeHours"
  | "mealAllowance";

function matchField(labelLc: string): SummaryField | null {
  const l = labelLc;
  if (l.includes("mã thẻ") || l.includes("ma the")) return "code";
  if (l.includes("họ và tên") || l.includes("họ tên") || l.includes("ho va ten")) return "name";
  if (l.includes("công chuẩn")) return "stdDays";
  if (l.includes("tổng n.c") || l.includes("tổng nc") || l.includes("công thực")) return "actualDays";
  if (l.includes("xăng")) return "gasDays";
  if (l.includes("tổng ot")) return "overtimeHours";
  if (l.includes("ot nt")) return "otWeekdayHours";
  if (l.includes("ot cn")) return "otSundayHours";
  if (l.includes("ot lễ") || l.includes("ot lể") || l.includes("ot le")) return "otHolidayHours";
  if (l.includes("cơm")) return "mealAllowance";
  return null;
}

function findPeriodInSheet(ws: ExcelJS.Worksheet, headerRow: number): string | null {
  // Tìm "KỲ MM/YYYY" (hoặc MM/YYYY) trong các hàng banner phía trên tiêu đề.
  for (let r = 1; r < headerRow; r++) {
    for (let c = 1; c <= 30; c++) {
      const s = toStr(ws.getRow(r).getCell(c).value);
      if (!s) continue;
      const m = s.match(/(\d{1,2})\s*\/\s*(\d{4})/);
      if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`;
    }
  }
  return null;
}

function parseSummaryWorkbook(
  wb: ExcelJS.Workbook,
  fallbackPeriod?: string,
): ParsedAttendance | null {
  for (const ws of wb.worksheets) {
    // Tìm hàng tiêu đề có cả "Họ và tên" và "Tổng N.C".
    const maxScan = Math.min(20, ws.rowCount || 20);
    let headerRow = 0;
    let colMap: Partial<Record<SummaryField, number>> = {};
    for (let r = 1; r <= maxScan; r++) {
      const m: Partial<Record<SummaryField, number>> = {};
      for (let c = 1; c <= 40; c++) {
        const label = toStr(ws.getRow(r).getCell(c).value).toLowerCase();
        if (!label) continue;
        const f = matchField(label);
        if (f && m[f] == null) m[f] = c;
      }
      if (m.name != null && m.actualDays != null) {
        headerRow = r;
        colMap = m;
        break;
      }
    }
    if (!headerRow) continue;

    const period = findPeriodInSheet(ws, headerRow) || fallbackPeriod || "";
    const warnings: string[] = ["Đọc từ bảng đã xuất của app (không phải file gốc máy chấm công)."];
    if (!period) {
      warnings.push("Không xác định được kỳ trong file — hãy chọn đúng kỳ trước khi nhập.");
    }

    const rows: AttendanceImportRow[] = [];
    const num = (r: number, f: SummaryField): number | undefined => {
      const c = colMap[f];
      if (c == null) return undefined;
      return toNum(ws.getRow(r).getCell(c).value) ?? undefined;
    };
    for (let r = headerRow + 1; r <= (ws.rowCount || headerRow + 1); r++) {
      const name = colMap.name ? toStr(ws.getRow(r).getCell(colMap.name).value) : "";
      const code = colMap.code ? toStr(ws.getRow(r).getCell(colMap.code).value) : "";
      if (!name && !code) continue;
      if (name && !isDataName(name)) break;
      rows.push({
        code: code || undefined,
        name: name || undefined,
        stdDays: num(r, "stdDays") ?? 26,
        actualDays: num(r, "actualDays") ?? 0,
        otWeekdayHours: num(r, "otWeekdayHours") ?? 0,
        otSundayHours: num(r, "otSundayHours") ?? 0,
        otHolidayHours: num(r, "otHolidayHours") ?? 0,
        overtimeHours: num(r, "overtimeHours"),
        gasDays: num(r, "gasDays") ?? 0,
        mealAllowance: num(r, "mealAllowance") ?? 0,
      });
    }
    if (rows.length) return { period, rows, warnings };
  }
  return null;
}
