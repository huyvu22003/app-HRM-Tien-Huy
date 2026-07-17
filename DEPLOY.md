# Deployment Guide — HRM Tiến Huy trên Cloudflare

## Yêu cầu
- Tài khoản Cloudflare (free tier đủ)
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- Tên miền đã trỏ về Cloudflare

## 1. Đăng nhập Wrangler
```
wrangler login
```

## 2. Tạo D1 Database
```
wrangler d1 create hrm-tien-huy-db
```
Copy `database_id` được trả về vào cả hai file `wrangler.toml` (root) và `api/wrangler.toml`.

## 3. Tạo R2 Bucket
```
wrangler r2 bucket create hrm-tien-huy-files
```

## 4. Chạy migration và seed
```
cd api
npm install
npm run db:migrate
npm run db:seed
```

## 5. Deploy API (Workers)
```
cd api
npm run deploy
```
Ghi lại URL của API (VD: `https://hrm-tien-huy-api.your-subdomain.workers.dev`).

## 6. Cấu hình Frontend
```
echo "NEXT_PUBLIC_API_URL=https://hrm-tien-huy-api.your-subdomain.workers.dev" > .env.production
```

## 7. Deploy Frontend (Pages)
```
npm run build
wrangler pages deploy out --project-name=hrm-tien-huy
```

## 8. Gắn tên miền
Trong Cloudflare Dashboard → Pages → hrm-tien-huy → Custom domains.
Thêm subdomain: `hrm.tienhuy.vn` (hoặc domain bạn muốn).

## 9. Cấu hình CORS
Cập nhật `api/wrangler.toml`:
```
CORS_ORIGIN = "https://hrm.yourdomain.com"
```
Sau đó redeploy API (`cd api && npm run deploy`).

## Tài khoản demo (sau khi seed)
Mật khẩu mặc định cho tất cả tài khoản demo: `123456`

| Số điện thoại | Vai trò |
|---|---|
| 0909000001 | super (Mr. Trung) |
| 0909000005 | super (_Huy - IT) |
| 0909000002 | hr (Ôn Thị Uy Lam) |
| 0909000003 | lead (Nguyễn Văn Thiện) |
| 0909000004 | staff (Chu Nam Anh) |

**Quan trọng:** đổi `JWT_SECRET` trong cả `wrangler.toml` và `api/wrangler.toml` trước khi deploy production.

## Cập nhật sau này
- Sửa code → push to GitHub → Pages tự deploy
- Sửa DB schema → thêm file migration mới trong `db/migrations/` → chạy `wrangler d1 execute hrm-tien-huy-db --file=db/migrations/00X_xxx.sql`
- Sửa API → `cd api && npm run deploy`
