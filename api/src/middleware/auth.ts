// JWT (HMAC-SHA256) helpers implemented with the Workers Web Crypto API.
// NOTE: password hashing uses SHA-256 for demo purposes only. In production,
// prefer a slow hash (e.g. bcrypt/scrypt via a WASM binding) to resist brute force.

export interface Env {
  DB: D1Database;
  // STORAGE (R2) là optional: chỉ có khi đã bật R2 + khai báo binding trong
  // wrangler.toml. Handler file phải guard trước khi dùng để Worker vẫn chạy
  // được khi R2 chưa bật.
  STORAGE?: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

export interface AuthUser {
  userId: number;
  role: string;
  exp: number;
  tokenVersion: number;
  mustChangePassword?: boolean;
}

export function effectiveRole(role: string, accountType?: string | null): string {
  return accountType === "director" ? "director" : role;
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const str = atob(padded + pad);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createToken(
  userId: number,
  role: string,
  secret: string,
  tokenVersion = 0,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthUser = { userId, role, tokenVersion, exp: now + expiresInSeconds };

  const encodedHeader = base64UrlEncode(textToBytes(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(textToBytes(JSON.stringify(payload)));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(data));
  const encodedSignature = base64UrlEncode(signature);

  return `${data}.${encodedSignature}`;
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await hmacKey(secret);
    const signatureBytes = base64UrlDecode(encodedSignature);
    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, textToBytes(data));
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as AuthUser;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function authMiddleware(request: Request, env: Env): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) return null;
  const user = await env.DB.prepare(
    "SELECT role, account_type, active, COALESCE(token_version, 0) AS token_version, COALESCE(must_change_password, 0) AS must_change_password FROM users WHERE id = ?",
  ).bind(payload.userId).first<{ role: string; account_type: string | null; active: number; token_version: number; must_change_password: number }>();
  const role = user ? effectiveRole(user.role, user.account_type) : "";
  if (!user?.active || role !== payload.role || user.token_version !== (payload.tokenVersion ?? 0)) return null;
  return { ...payload, mustChangePassword: Boolean(user.must_change_password) };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = 100_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", textToBytes(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("pbkdf2$")) {
    const [, iterationsText, saltHex, expectedHex] = hash.split("$");
    const iterations = Number(iterationsText);
    if (!iterations || !saltHex || !expectedHex) return false;
    const key = await crypto.subtle.importKey("raw", textToBytes(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations }, key, 256);
    return bytesToHex(new Uint8Array(bits)) === expectedHex;
  }

  // Backward compatibility for existing SHA-256 hashes. Passwords created or
  // reset through the account-management API use PBKDF2 above.
  const digest = await crypto.subtle.digest("SHA-256", textToBytes(password));
  return bytesToHex(new Uint8Array(digest)) === hash;
}
