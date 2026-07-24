#!/usr/bin/env bash
#
# Triển khai backend HRM Tiến Huy lên Cloudflare:
#   1. Tạo D1 (bỏ qua nếu đã có)
#   2. Ghi database_id vào wrangler.toml + api/wrangler.toml
#   3. Chạy migration 001→005 + seed dữ liệu (remote)
#   4. Deploy Worker API
#   5. In URL Worker để trỏ NEXT_PUBLIC_API_URL cho Cloudflare Pages
#
# Yêu cầu xác thực Cloudflare trước khi chạy, theo 1 trong 2 cách:
#   a) wrangler login            (mở trình duyệt, chạy trên máy cá nhân)
#   b) export CLOUDFLARE_API_TOKEN=...  và  export CLOUDFLARE_ACCOUNT_ID=...
#      (token cần quyền: D1 Edit, Workers Scripts Edit, Account Settings Read)
#
# Cách dùng:  bash scripts/deploy-backend.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
DB_NAME="hrm-tien-huy-db"
WRANGLER="npx --yes wrangler@4"

echo "==> Kiểm tra đăng nhập Cloudflare..."
if ! $WRANGLER whoami >/dev/null 2>&1; then
  echo "!! Chưa đăng nhập Cloudflare. Chạy 'wrangler login' hoặc đặt CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID." >&2
  exit 1
fi

echo "==> (1/5) Tạo D1 '$DB_NAME' (bỏ qua nếu đã tồn tại)..."
CREATE_OUT="$($WRANGLER d1 create "$DB_NAME" 2>&1 || true)"
echo "$CREATE_OUT"

UUID_RE='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
DB_ID="$(printf '%s\n' "$CREATE_OUT" | grep -oE "$UUID_RE" | head -1 || true)"

if [ -z "$DB_ID" ]; then
  echo "   D1 có thể đã tồn tại — tra cứu database_id..."
  DB_ID="$($WRANGLER d1 info "$DB_NAME" 2>/dev/null | grep -oE "$UUID_RE" | head -1 || true)"
fi

if [ -z "$DB_ID" ]; then
  echo "!! Không lấy được database_id. Kiểm tra lại tài khoản/quyền rồi chạy lại." >&2
  exit 1
fi
echo "   database_id = $DB_ID"

echo "==> (2/5) Ghi database_id vào wrangler.toml + api/wrangler.toml..."
sed -i.bak -E "s|database_id = \".*\"|database_id = \"$DB_ID\"|" "$ROOT/wrangler.toml" "$ROOT/api/wrangler.toml"
rm -f "$ROOT/wrangler.toml.bak" "$ROOT/api/wrangler.toml.bak"

# Thứ tự phải xen kẽ: migration 004 backfill manager_employee_id từ dữ liệu
# nhân viên nên phải chạy SAU seed.sql.
echo "==> (3/5) Chạy migration + seed theo thứ tự (remote)..."
STEPS=(
  "migrations/001_initial.sql"
  "seed.sql"
  "migrations/002_kpi_subscores_recognition.sql"
  "seed_002_subscores.sql"
  "migrations/003_salary_overhaul.sql"
  "seed_003_salary_overhaul.sql"
  "migrations/004_employee_manager_relationship.sql"
  "migrations/005_custom_fields.sql"
)
for step in "${STEPS[@]}"; do
  f="$ROOT/db/$step"
  [ -f "$f" ] || { echo "   (bỏ qua, không thấy: $step)"; continue; }
  echo "   -> $step"
  $WRANGLER d1 execute "$DB_NAME" --remote --yes --file="$f"
done

echo "==> (3.5/5) Tạo R2 bucket 'hrm-tien-huy-files' (bỏ qua nếu đã có)..."
$WRANGLER r2 bucket create hrm-tien-huy-files 2>&1 | head -5 || true

echo "==> LƯU Ý trước khi deploy Worker:"
echo "    - CORS_ORIGIN trong api/wrangler.toml phải khớp domain frontend."
echo "      Hiện tại = 'https://hrm.tienhuy.vn'. Nếu frontend chạy ở *.pages.dev,"
echo "      hãy sửa CORS_ORIGIN cho đúng (hoặc đặt '*' để tạm mở) rồi chạy lại,"
echo "      nếu không trình duyệt sẽ chặn API vì CORS."
echo "    - JWT_SECRET nên đổi khỏi 'change-this-in-production'"
echo "      (đặt bí mật:  wrangler secret put JWT_SECRET)."
echo ""

echo "==> (4/5) Deploy Worker API..."
cd "$ROOT/api"
DEPLOY_OUT="$($WRANGLER deploy 2>&1)"
echo "$DEPLOY_OUT"
WORKER_URL="$(printf '%s\n' "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1 || true)"
cd "$ROOT"

echo ""
echo "==> (5/5) HOÀN TẤT BACKEND."
if [ -n "$WORKER_URL" ]; then
  echo "    Worker URL: $WORKER_URL"
  echo ""
  echo "    Bước cuối — trỏ frontend về Worker:"
  echo "    Trong Cloudflare Pages (project app-hrm-tien-huy) > Settings > Environment variables,"
  echo "    đặt:  NEXT_PUBLIC_API_URL = ${WORKER_URL}/api"
  echo "    rồi Retry deployment (hoặc push commit mới) để build lại frontend."
else
  echo "    Không đọc được Worker URL tự động — xem log deploy phía trên để lấy URL *.workers.dev,"
  echo "    rồi đặt NEXT_PUBLIC_API_URL = <worker-url>/api trong Cloudflare Pages."
fi
echo ""
echo "    Lưu ý: database_id vừa ghi vào wrangler.toml — commit lại 2 file này."
