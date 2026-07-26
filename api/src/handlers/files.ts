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
