import type { Env } from "../middleware/auth";
import { json, error, readJson } from "../utils";

const SELFIE_ENABLED_EMPLOYEE_CODES = new Set(["0187"]);

interface CheckinEmployee {
  id: number;
  code: string;
  photo_url: string | null;
}

export function isSelfieEnabledEmployeeCode(code: string | null | undefined): boolean {
  return SELFIE_ENABLED_EMPLOYEE_CODES.has(String(code ?? "").trim());
}

/** Nhân viên gắn với tài khoản đăng nhập. */
async function employeeOf(env: Env, userId: number): Promise<CheckinEmployee | null> {
  return env.DB.prepare(
    `SELECT e.id, e.code, e.photo_url
     FROM users u
     JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ? AND u.active = 1 AND e.status = 'Đang làm việc'`,
  ).bind(userId).first<CheckinEmployee>();
}

interface CheckinRow {
  id: number; employee_id: number; date: string;
  time_in: string | null; time_out: string | null;
  lat: number | null; lng: number | null; accuracy: number | null;
  photo_key: string | null; photo_out_key: string | null; workplace: string | null;
}

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Giải mã data URL base64 → bytes để lưu R2. */
function dataUrlToBytes(dataUrl: string): { bytes: ArrayBuffer; type: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { bytes: arr.buffer, type: m[1] || "image/jpeg" };
}

/** GET /api/attendance/checkin/today — trạng thái chấm công hôm nay của người đăng nhập. */
export async function getTodayCheckin(_request: Request, env: Env, userId: number): Promise<Response> {
  const employee = await employeeOf(env, userId);
  if (!employee || !isSelfieEnabledEmployeeCode(employee.code)) return json({ data: null, enabled: false });
  const row = await env.DB.prepare("SELECT * FROM checkins WHERE employee_id = ? AND date = ?")
    .bind(employee.id, todayStr())
    .first<CheckinRow>();
  return json({ data: row ?? null, enabled: true, referencePhotoUrl: employee.photo_url });
}

interface CheckinBody {
  type?: "in" | "out";
  time?: string;
  lat?: number; lng?: number; accuracy?: number;
  workplace?: string;
  photo?: string; // data URL
  faceSimilarity?: number;
  faceReal?: number;
  faceLive?: number;
  blinkVerified?: boolean;
}

export function validateFaceProof(body: Pick<CheckinBody, "faceSimilarity" | "faceReal" | "faceLive" | "blinkVerified">): string | null {
  if (typeof body.faceSimilarity !== "number" || body.faceSimilarity < 0.55) return "Khuôn mặt không khớp ảnh hồ sơ";
  if (typeof body.faceReal !== "number" || body.faceReal < 0.6
    || typeof body.faceLive !== "number" || body.faceLive < 0.6
    || body.blinkVerified !== true) {
    return "Không xác nhận được khuôn mặt trực tiếp. Vui lòng nhìn camera và chớp mắt";
  }
  return null;
}

/**
 * POST /api/attendance/checkin — ghi nhận chấm công vào/ra kèm ảnh selfie + toạ độ.
 * Ảnh lưu R2 (nếu bật); nếu R2 chưa bật vẫn ghi nhận giờ + toạ độ.
 */
export async function saveCheckin(request: Request, env: Env, userId: number): Promise<Response> {
  const employee = await employeeOf(env, userId);
  if (!employee) return error("Tài khoản chưa gắn nhân viên đang làm việc", 404);
  if (!isSelfieEnabledEmployeeCode(employee.code)) return error("Tài khoản chưa được kích hoạt chấm công selfie", 403);
  if (!employee.photo_url) return error("Hồ sơ nhân viên chưa có ảnh khuôn mặt chuẩn", 400);
  const empId = employee.id;

  const body = await readJson<CheckinBody>(request);
  if (typeof body.lat !== "number" || !Number.isFinite(body.lat)
    || typeof body.lng !== "number" || !Number.isFinite(body.lng)) {
    return error("Phải bật định vị GPS để chấm công", 400);
  }
  if (!body.photo || !/^data:image\/(jpeg|jpg|png);base64,/i.test(body.photo)) {
    return error("Phải chụp ảnh selfie để chấm công", 400);
  }
  const faceProofError = validateFaceProof(body);
  if (faceProofError) return error(faceProofError, 403);
  const type = body.type === "out" ? "out" : "in";
  const now = new Date();
  const time = body.time || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = todayStr();

  // Lưu ảnh lên R2 (nếu có ảnh và R2 đã bật).
  let photoKey: string | null = null;
  if (body.photo && env.STORAGE) {
    const decoded = dataUrlToBytes(body.photo);
    if (decoded) {
      const ext = decoded.type.includes("png") ? "png" : "jpg";
      photoKey = `checkin-${empId}-${date}-${type}-${Date.now()}.${ext}`;
      await env.STORAGE.put(photoKey, decoded.bytes, { httpMetadata: { contentType: decoded.type } });
    }
  }

  const existing = await env.DB.prepare("SELECT * FROM checkins WHERE employee_id = ? AND date = ?")
    .bind(empId, date)
    .first<CheckinRow>();

  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO checkins (employee_id, date, time_in, time_out, lat, lng, accuracy, photo_key, photo_out_key, workplace, face_similarity, face_real, face_live) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        empId, date,
        type === "in" ? time : null,
        type === "out" ? time : null,
        body.lat, body.lng, body.accuracy ?? null,
        type === "in" ? photoKey : null,
        type === "out" ? photoKey : null,
        body.workplace ?? null,
        body.faceSimilarity, body.faceReal, body.faceLive,
      )
      .run();
  } else if (type === "in") {
    await env.DB.prepare("UPDATE checkins SET time_in = ?, lat = ?, lng = ?, accuracy = ?, photo_key = COALESCE(?, photo_key), workplace = ?, face_similarity = ?, face_real = ?, face_live = ? WHERE id = ?")
      .bind(time, body.lat, body.lng, body.accuracy ?? existing.accuracy, photoKey, body.workplace ?? existing.workplace, body.faceSimilarity, body.faceReal, body.faceLive, existing.id)
      .run();
  } else {
    await env.DB.prepare("UPDATE checkins SET time_out = ?, lat = ?, lng = ?, accuracy = ?, photo_out_key = COALESCE(?, photo_out_key), workplace = ?, face_similarity = ?, face_real = ?, face_live = ? WHERE id = ?")
      .bind(time, body.lat, body.lng, body.accuracy ?? existing.accuracy, photoKey, body.workplace ?? existing.workplace, body.faceSimilarity, body.faceReal, body.faceLive, existing.id)
      .run();
  }

  const row = await env.DB.prepare("SELECT * FROM checkins WHERE employee_id = ? AND date = ?").bind(empId, date).first<CheckinRow>();
  return json({ success: true, data: row }, 201);
}

/** GET /api/checkins?date=YYYY-MM-DD — nhật ký chấm công selfie trong ngày (quản lý). */
export async function listCheckins(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayStr();
  const { results } = await env.DB.prepare(
    `SELECT c.*, e.name AS employee_name, e.code AS employee_code, d.name AS department_name
     FROM checkins c
     JOIN employees e ON e.id = c.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE c.date = ?
     ORDER BY e.code`,
  )
    .bind(date)
    .all();
  return json({ data: results, date });
}

/** GET /api/checkin-photos/:key — phục vụ ảnh chấm công (yêu cầu đăng nhập). */
export async function serveCheckinPhoto(_request: Request, env: Env, key: string): Promise<Response> {
  if (!env.STORAGE) return error("Kho lưu trữ R2 chưa được bật.", 503);
  const obj = await env.STORAGE.get(key);
  if (!obj) return error("Không tìm thấy ảnh", 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
}
