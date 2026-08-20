import type { Env } from "../middleware/auth";
import { json, error, readJson } from "../utils";

/** Nhân viên gắn với tài khoản đăng nhập. */
async function employeeIdOf(env: Env, userId: number): Promise<number | null> {
  const u = await env.DB.prepare("SELECT employee_id FROM users WHERE id = ?").bind(userId).first<{ employee_id: number | null }>();
  return u?.employee_id ?? null;
}

interface CheckinRow {
  id: number; employee_id: number; date: string;
  time_in: string | null; time_out: string | null;
  lat: number | null; lng: number | null; accuracy: number | null;
  photo_key: string | null; photo_out_key: string | null; workplace: string | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  const empId = await employeeIdOf(env, userId);
  if (!empId) return json({ data: null });
  const row = await env.DB.prepare("SELECT * FROM checkins WHERE employee_id = ? AND date = ?")
    .bind(empId, todayStr())
    .first<CheckinRow>();
  return json({ data: row ?? null });
}

interface CheckinBody {
  type?: "in" | "out";
  time?: string;
  lat?: number; lng?: number; accuracy?: number;
  workplace?: string;
  photo?: string; // data URL
}

/**
 * POST /api/attendance/checkin — ghi nhận chấm công vào/ra kèm ảnh selfie + toạ độ.
 * Ảnh lưu R2 (nếu bật); nếu R2 chưa bật vẫn ghi nhận giờ + toạ độ.
 */
export async function saveCheckin(request: Request, env: Env, userId: number): Promise<Response> {
  const empId = await employeeIdOf(env, userId);
  if (!empId) return error("Tài khoản chưa gắn nhân viên", 404);

  const body = await readJson<CheckinBody>(request);
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
      "INSERT INTO checkins (employee_id, date, time_in, time_out, lat, lng, accuracy, photo_key, photo_out_key, workplace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        empId, date,
        type === "in" ? time : null,
        type === "out" ? time : null,
        body.lat ?? null, body.lng ?? null, body.accuracy ?? null,
        type === "in" ? photoKey : null,
        type === "out" ? photoKey : null,
        body.workplace ?? null,
      )
      .run();
  } else if (type === "in") {
    await env.DB.prepare("UPDATE checkins SET time_in = ?, lat = ?, lng = ?, accuracy = ?, photo_key = COALESCE(?, photo_key), workplace = ? WHERE id = ?")
      .bind(time, body.lat ?? existing.lat, body.lng ?? existing.lng, body.accuracy ?? existing.accuracy, photoKey, body.workplace ?? existing.workplace, existing.id)
      .run();
  } else {
    await env.DB.prepare("UPDATE checkins SET time_out = ?, photo_out_key = COALESCE(?, photo_out_key) WHERE id = ?")
      .bind(time, photoKey, existing.id)
      .run();
  }

  const row = await env.DB.prepare("SELECT * FROM checkins WHERE employee_id = ? AND date = ?").bind(empId, date).first<CheckinRow>();
  return json({ success: true, data: row }, 201);
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
