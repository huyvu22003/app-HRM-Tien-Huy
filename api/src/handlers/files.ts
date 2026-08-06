import type { Env } from "../middleware/auth";
import { error } from "../utils";

export async function uploadFile(request: Request, env: Env): Promise<Response> {
  if (!env.STORAGE) {
    return error("Kho lưu trữ R2 chưa được bật. Vui lòng enable R2 trong Cloudflare rồi thử lại.", 503);
  }
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const entry = form.get("file");
    const isFileLike =
      entry !== null &&
      typeof entry === "object" &&
      "arrayBuffer" in entry &&
      typeof (entry as { arrayBuffer?: unknown }).arrayBuffer === "function";
    if (!isFileLike) {
      return error("Thiếu file để tải lên", 400);
    }
    const file = entry as unknown as { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };
    const key = `${Date.now()}-${file.name}`;
    await env.STORAGE.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    return new Response(JSON.stringify({ key, size: file.size, name: file.name }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  // Fallback: raw binary body upload with a filename query param.
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || `upload-${Date.now()}`;
  const key = `${Date.now()}-${name}`;
  const body = await request.arrayBuffer();
  await env.STORAGE.put(key, body, {
    httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
  });
  return new Response(JSON.stringify({ key, size: body.byteLength, name }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

export async function downloadFile(_request: Request, env: Env, key: string): Promise<Response> {
  if (!env.STORAGE) {
    return error("Kho lưu trữ R2 chưa được bật.", 503);
  }
  const object = await env.STORAGE.get(key);
  if (!object) return error("Không tìm thấy tệp tin", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
}

/**
 * Avatar nhân viên: lưu ảnh vào R2 (không nhét vào D1) và ghi URL công khai
 * vào cột employees.photo_url. Trả về URL để frontend hiển thị ngay.
 */
export async function uploadAvatar(request: Request, env: Env, id: string): Promise<Response> {
  if (!env.STORAGE) {
    return error("Kho lưu trữ R2 chưa được bật.", 503);
  }
  const contentType = request.headers.get("content-type") || "image/jpeg";
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return error("Thiếu dữ liệu ảnh", 400);

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const key = `avatar-${id}-${Date.now()}.${ext}`;
  await env.STORAGE.put(key, bytes, { httpMetadata: { contentType } });

  const url = `${new URL(request.url).origin}/api/avatars/${key}`;
  await env.DB.prepare("UPDATE employees SET photo_url = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(url, id)
    .run();

  return new Response(JSON.stringify({ url, key }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

/** Phục vụ ảnh avatar từ R2 (route công khai, để thẻ <img> tải được). */
export async function serveAvatar(_request: Request, env: Env, key: string): Promise<Response> {
  if (!env.STORAGE) return error("Kho lưu trữ R2 chưa được bật.", 503);
  const object = await env.STORAGE.get(key);
  if (!object) return error("Không tìm thấy ảnh", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(object.body, { headers });
}

function extFor(contentType: string, name: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  }
  return "bin";
}

/**
 * Giấy chứng nhận nghỉ hưởng BHXH của một lần khám thai. Lưu bytes thô vào R2
 * với key sạch (không nhét tên tệp gốc vào key để tránh lỗi ký tự/đường dẫn);
 * tên gốc trả về để frontend hiển thị và ghi vào prenatal_checkups.doc_name.
 */
export async function uploadCheckupDoc(request: Request, env: Env): Promise<Response> {
  if (!env.STORAGE) {
    return error("Kho lưu trữ R2 chưa được bật. Vui lòng enable R2 trong Cloudflare rồi thử lại.", 503);
  }
  const url = new URL(request.url);
  const name = url.searchParams.get("name") || `giay-bhxh-${Date.now()}`;
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return error("Thiếu dữ liệu tệp", 400);

  const key = `checkup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(contentType, name)}`;
  await env.STORAGE.put(key, bytes, { httpMetadata: { contentType } });

  return new Response(JSON.stringify({ key, name }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

/** Phục vụ giấy BHXH khám thai (yêu cầu đăng nhập — tài liệu nội bộ, không công khai). */
export async function serveCheckupDoc(_request: Request, env: Env, key: string): Promise<Response> {
  if (!env.STORAGE) return error("Kho lưu trữ R2 chưa được bật.", 503);
  const object = await env.STORAGE.get(key);
  if (!object) return error("Không tìm thấy tệp", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}
