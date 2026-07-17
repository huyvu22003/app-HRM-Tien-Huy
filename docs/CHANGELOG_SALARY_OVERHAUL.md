# Salary Overhaul: Chuẩn hóa theo bảng lương thực tế T06/2026

## Tổng quan
Thiết kế lại toàn bộ hệ thống tính lương khớp với bảng lương Excel thực tế của công ty (44 cột, 20 nhân viên). Bổ sung phiếu lương in được với logo công ty.

## Thay đổi chi tiết

### Database (Migration 003)
**File:** `db/migrations/003_salary_overhaul.sql`

- `compensation`: thêm `responsibility_salary`, `gas_allowance`, `attendance_bonus`, `union_dues`
- `insurance`: thêm `bhxh_amount`, `bhyt_amount`, `bhtn_amount` (nhập cứng theo mức đóng BH từng người)
- `attendance`: thêm `gas_days`, `leave_days`, `ot_holiday_hours`, `ot_night_hours`, `meal_allowance`, `night_allowance`, `bonus`

**Seed data:** `db/seed_003_salary_overhaul.sql` — cập nhật đầy đủ dữ liệu lương T06/2026 cho 20 nhân viên từ file Excel.

### Công thức tính lương (khớp Excel)

| Khoản mục | Công thức |
|---|---|
| Lương ngày công | base / 26 × actualDays |
| Trách nhiệm thực tế | responsibility / 26 × actualDays |
| Phụ cấp thực tế | allowance / 26 × actualDays |
| TC ngày thường | base / 26 / 8 × hours × 150% |
| TC chủ nhật | base / 26 / 8 × hours × 200% |
| TC ngày lễ | base / 26 / 8 × hours × 300% |
| Phần miễn thuế | TC thường / 3, TC CN / 2 |
| Phụ cấp xăng xe TT | gasAllowance / 26 × gasDays |
| Lương phép năm | base / 26 × leaveDays |
| Tổng thu nhập | SUM(tất cả khoản trên, bao gồm phần miễn thuế) |
| Thu nhập chịu thuế | Tổng TN − phần miễn thuế |
| Bảo hiểm | BHXH + BHYT + BHTN (nhập cứng) |
| Thu nhập tính thuế | Chịu thuế − BH − 15.500.000 − NPT × 6.200.000 |
| Thuế TNCN | Biểu lũy tiến 5 bậc 2026 |
| Thực nhận | Tổng TN − ĐPCĐ − BH − Tạm ứng − Thuế |

### Biểu thuế TNCN 2026 (5 bậc)
| Bậc | Thu nhập tính thuế | Thuế suất |
|---|---|---|
| 1 | ≤ 10 triệu | 5% |
| 2 | 10–30 triệu | 10% |
| 3 | 30–60 triệu | 20% |
| 4 | 60–100 triệu | 30% |
| 5 | > 100 triệu | 35% |

### API Backend
**File:** `api/src/handlers/salary.ts`
- Query mở rộng: thêm `responsibility_salary`, `gas_allowance`, `attendance_bonus`, `union_dues`, `gas_days`, `leave_days`, `ot_holiday_hours`, `ot_night_hours`, `meal_allowance`, `night_allowance`, `bonus`, `bhxh_amount`, `bhyt_amount`, `bhtn_amount`

### Frontend — Salary Screen
**File:** `src/components/screens/salary-screen.tsx`
- Công thức tính lương viết lại hoàn toàn theo Excel (5 thành phần lương, 4 loại OT, phần miễn thuế, phụ cấp xăng theo ngày riêng, phép năm, phụ cấp cơm/đêm, thưởng)
- Bảng lương hiển thị: nhân viên, bộ phận, công, lương công, trách nhiệm, tăng ca, tổng TN, BH, thuế, tạm ứng, thực nhận
- Modal phiếu lương chi tiết 4 khối (thông tin lương + ngày công + thu nhập + khoản trừ)
- **Nút "In phiếu lương"**: tạo bố cục A4 portrait, 2 phiếu/trang, có logo công ty, đường kẻ cắt, ký tên

### Frontend — Formula Screen
**File:** `src/components/screens/formula-screen.tsx`
- Cập nhật biểu thuế 5 bậc 2026 (thay 7 bậc cũ)
- Preview dùng dữ liệu Hoàng Công Phúc (khớp Excel: thực nhận 16.845.744đ)
- Hiển thị giảm trừ gia cảnh mới: 15,5tr bản thân + 6,2tr/NPT

### Config
**File:** `src/lib/data/config.ts`
- `DEFAULT_PIT`: 5 bậc (10M/30M/60M/100M/∞)
- `tax.personalDeduction`: 15.500.000 (cũ: 11.000.000)
- `tax.dependentDeduction`: 6.200.000 (cũ: 4.400.000)
- `FX_ORDER/FX_SRC/FX_LABEL`: pipeline mới phản ánh công thức thực tế

### Client API Types
**File:** `src/lib/api.ts`
- `ApiSalaryRow`: thêm 14 trường mới (responsibility_salary, gas_allowance, attendance_bonus, union_dues, gas_days, leave_days, ot_holiday_hours, ot_night_hours, meal_allowance, night_allowance, bonus, bhxh_amount, bhyt_amount, bhtn_amount)

## Xác minh
Đã kiểm tra công thức với nhân viên Hoàng Công Phúc (STT 1):
- Tổng thu nhập: 17.600.000đ ✓
- Thu nhập chịu thuế: 17.250.000đ ✓
- Thuế TNCN: 0đ ✓
- Thực nhận: 16.845.744đ ✓

## Hướng dẫn deploy
1. Chạy migration: `wrangler d1 execute hrm-db --file=db/migrations/003_salary_overhaul.sql`
2. Chạy seed: `wrangler d1 execute hrm-db --file=db/seed_003_salary_overhaul.sql`
3. Deploy API: `cd api && wrangler deploy`
4. Build + deploy frontend: `npm run build` → Cloudflare Pages
