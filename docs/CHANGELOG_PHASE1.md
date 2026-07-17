# Phase 1: KPI + Lương + Khen thưởng

## Tổng quan
Chuẩn hoá hệ thống theo FUNCTIONAL_SPEC.md — Phase 1 bao gồm KPI sub-scores, công thức lương đầy đủ, và phân hệ khen thưởng/cải thiện.

## Thay đổi chi tiết

### Database (Migration 002)
**File:** `db/migrations/002_kpi_subscores_recognition.sql`

- Thêm cột KPI sub-scores vào `kpi_scores`: `bc` (max 25), `ns` (max 30), `cl` (max 25), `dg` (max 20)
- Thêm cột `note`, `is_edited` vào `kpi_scores`
- Tạo bảng `rewards` — đề xuất khen thưởng (kpi_bonus / hot_bonus / recognition)
- Tạo bảng `improvement_plans` — kế hoạch cải thiện cho nhân viên KPI < 83
- Thêm cột `kpi_bonus`, `hot_bonus`, `advance` vào `compensation`
- Thêm cột `ot_weekday_hours`, `ot_sunday_hours` vào `attendance`

**Seed data:** `db/seed_002_subscores.sql` — backfill sub-scores cho 83 bản ghi KPI hiện có + mẫu rewards và improvement plans.

### API Backend
**Sửa:** `api/src/handlers/kpi.ts`
- GET `/api/kpi` — bổ sung department_name trong response
- POST `/api/kpi` — tạo bản ghi KPI mới (tự tính score = bc+ns+cl+dg, tự xếp loại)
- PUT `/api/kpi/:id` — sửa sub-scores (tự tính lại score + rank)
- POST `/api/kpi/:id/sign` — ký duyệt level 1 (tổ trưởng) hoặc level 2 (BGĐ/HR)

**Mới:** `api/src/handlers/recognition.ts`
- GET `/api/rewards` — danh sách khen thưởng (filter theo period)
- POST `/api/rewards` — đề xuất khen thưởng
- PUT `/api/rewards/:id` — duyệt/từ chối đề xuất
- GET `/api/improvement-plans` — danh sách kế hoạch cải thiện
- POST `/api/improvement-plans` — tạo kế hoạch cải thiện (upsert)

**Sửa:** `api/src/handlers/salary.ts`
- Query bổ sung: `actual_days`, `std_days`, `ot_weekday_hours`, `ot_sunday_hours`, `kpi_bonus`, `hot_bonus`, `advance`, `kpi_score`, `kpi_rank`, `department_name`

**Sửa:** `api/src/index.ts` — đăng ký tất cả route mới

### Frontend — KPI Screen
**File:** `src/components/screens/kpi-screen.tsx`
- Hiển thị 4 sub-scores (BC/NS/CL/DG) trên bảng
- Inline edit sub-scores với giới hạn max cho từng cột
- Tự tính tổng điểm + xếp loại khi edit (Xuất sắc ≥93, Tốt ≥90, Khá ≥83, Đạt ≥70, Cần CT <70)
- Dashboard thống kê: tổng NV, điểm TB, phân bổ theo xếp loại
- Nút ký duyệt 2 cấp: L1 (tổ trưởng), L2 (HR/super) — L2 chỉ khả dụng sau khi L1 đã ký
- Badge xếp loại với màu sắc

### Frontend — Salary Screen
**File:** `src/components/screens/salary-screen.tsx`
- Công thức lương đầy đủ theo spec §4.2:
  - `workSalary = base ÷ stdDays × actualDays`
  - OT tách weekday (×1.5) và sunday (×2.0)
  - Cộng kpiBonus + hotBonus
  - Trừ BHXH, thuế TNCN (luỹ tiến 7 bậc), tạm ứng
- Bộ lọc phòng ban
- Dashboard tổng hợp: tổng gross, BHXH, thuế, thực nhận
- Phiếu lương chi tiết hiển thị đầy đủ các khoản

### Frontend — Recognition Screen
**File:** `src/components/screens/recognition-screen.tsx`
- Tab "Khen thưởng": bảng danh sách rewards với type/amount/status
- Tab "Cải thiện": card grid hiển thị improvement plans
- Modal đề xuất khen thưởng: chọn NV, loại, số tiền, lý do
- Nút duyệt/từ chối cho HR/super
- Dashboard: chờ duyệt, đã duyệt, tổng thưởng, số cải thiện

### Frontend — Formula Screen
**File:** `src/components/screens/formula-screen.tsx`
- Fix bug preview: sử dụng progressive PIT thay vì chỉ dùng bậc 1
- Preview hiển thị lương theo công (base ÷ stdDays × actualDays)
- Bổ sung thông tin nhân viên mẫu (công, OT)

### Client API Types
**File:** `src/lib/api.ts`
- `ApiKpi`: thêm bc, ns, cl, dg, note, is_edited, department_name
- `ApiSalaryRow`: thêm department_id/name, std_days, actual_days, ot_weekday/sunday, kpi_bonus, hot_bonus, advance, kpi_score/rank
- Thêm functions: `createKpi`, `updateKpi`, `signKpi`
- Thêm types + functions: `ApiReward`, `ApiImprovementPlan`, `fetchRewards`, `createReward`, `updateReward`, `fetchImprovementPlans`, `createImprovementPlan`

## Xếp loại KPI (theo spec §3.11)
| Điểm | Xếp loại |
|------|----------|
| ≥ 93 | Xuất sắc |
| ≥ 90 | Tốt |
| ≥ 83 | Khá |
| ≥ 70 | Đạt |
| < 70 | Cần cải thiện |

## Hướng dẫn deploy
1. Chạy migration: `wrangler d1 execute hrm-db --file=db/migrations/002_kpi_subscores_recognition.sql`
2. Chạy seed: `wrangler d1 execute hrm-db --file=db/seed_002_subscores.sql`
3. Deploy API: `cd api && wrangler deploy`
4. Build + deploy frontend: `npm run build` → Cloudflare Pages
