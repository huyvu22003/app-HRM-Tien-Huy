# ĐẶC TẢ CHỨC NĂNG CHI TIẾT — HRM Tiến Huy
### (Functional Specification · dùng cho Claude Code triển khai source thật)

> **Công ty TNHH Cơ khí Khuôn mẫu Tiến Huy** · 81 nhân sự / 22 bộ phận · kỳ dữ liệu mẫu **06/2026**
> Tài liệu này mô tả **từng phân hệ, từng chức năng, từng hành động, từng luồng nghiệp vụ và template áp dụng**. Prototype `HRM Tiến Huy.dc.html` là nguồn tham chiếu pixel. Giá trị seed/mặc định ở `DATA_AND_CONFIG.md`.

---

## 0. CÁCH DÙNG TÀI LIỆU NÀY (đọc trước khi code)

**Vì sao Claude Code bị thiếu chức năng ở lần trước — và cách khắc phục:**

1. **Bàn giao cũ mô tả module ở mức “tên + 1 câu”, không liệt kê từng nút/hành động.** Claude Code chỉ dựng được khung, bỏ sót các thao tác con (sửa inline, modal, bộ lọc, duyệt nhiều cấp, in ấn…). → Tài liệu này liệt kê **checklist hành động cho từng màn** (mục 3). **Bắt buộc tick hết.**
2. **Nhiều chức năng nằm ở lớp tương tác (modal, drill-down, ký duyệt), không nhìn thấy trên ảnh tĩnh.** → Mỗi màn dưới đây có mục **“Tương tác & trạng thái”** ghi rõ.
3. **Quy tắc nghiệp vụ (duyệt phép nhiều cấp, trừ quỹ, thuế luỹ tiến, thai sản…) không được viết thành pseudo-code.** → Mục 4 viết **công thức & luật rõ ràng**.
4. **Không có tiêu chí nghiệm thu.** → Mục 6 là **Acceptance checklist**: chức năng chỉ tính “xong” khi pass hết.

**Quy trình đề nghị cho Claude Code:**
- Đọc `ARCHITECTURE.md` (tech-stack, data model) → `DATA_AND_CONFIG.md` (seed) → tài liệu này (chức năng).
- Triển khai **theo từng phân hệ ở mục 3**, mỗi phân hệ hoàn thành **toàn bộ checklist** rồi mới sang phân hệ kế.
- Sau mỗi phân hệ, đối chiếu **mục 6 (Acceptance)**. Không bỏ qua các thao tác con.

---

## 1. NGUYÊN TẮC XUYÊN SUỐT (áp dụng cho MỌI màn)

- **Phân quyền theo tài khoản.** Đăng nhập bằng **SĐT + mật khẩu**; vai trò gắn theo tài khoản (`super` / `hr` / `lead` / `staff`). Sidebar lọc theo `ROLE_META[role].nav`; chặn truy cập màn ngoài quyền; nút thêm/sửa & trường Lương/PII ẩn theo `canEdit`; read-only role thấy **banner “chỉ xem”**. (Chi tiết `DATA_AND_CONFIG.md §1–2`.)
- **Mọi thay đổi cấu hình đều qua nút “Lưu”** + trạng thái “chưa lưu” (dirty) + toast xác nhận; và **ghi audit log**.
- **Mọi bảng danh sách** đều có: tìm kiếm, lọc (bộ phận / trạng thái), phân trang khi dài, dòng đếm “Hiển thị X / Y”.
- **Mọi thao tác ghi dữ liệu** hiện **toast** (“✓ Đã lưu · ghi audit log”).
- **Kỳ làm việc theo tháng**; nút chọn tháng ở header.
- **Chốt kỳ (khoá tháng)** khoá sửa dữ liệu; **ký duyệt 2 cấp** (Tổ trưởng → BGĐ) cho Chấm công & KPI.
- **Định dạng số tiền** `1.234.567₫` (vi-VN); ngày `dd/mm/yyyy`; ô chọn ngày dùng **date-picker** (ISO nội bộ, hiển thị dd/mm/yyyy).
- **Template in ấn** dùng chung bộ nhận diện (mục 5).

---

## 2. BẢN ĐỒ ĐIỀU HƯỚNG (sidebar / topbar — 2 biến thể layout)

| Nhóm | Màn (screen id) | Ai thấy |
|---|---|---|
| **Tổng quan** | Sơ đồ khung (`framework`) · Dashboard BGĐ (`dashboard`) | super, hr; framework chỉ super/hr |
| **Nhân sự** | Nhân viên (`employees`) → Hồ sơ (`employee`) · Sơ đồ tổ chức (`org`) | tất cả (staff chỉ hồ sơ mình) |
| **Vận hành** | Chấm công (`attendance`) · Phép năm (`leave`) · **Lương thưởng (`salary`)** · Báo cáo ngày (`report`) | theo quyền; salary chỉ super/hr |
| **Hiệu suất** | KPI & Xếp hạng (`kpi`) · Khen thưởng & Cải thiện (`recognition`) · Payroll đối chiếu (`payroll`) | theo quyền |
| **Phát triển** | Đào tạo & Kỹ năng (`training`) | tất cả trừ staff |
| **Quản trị** | Phân quyền & Vai trò (`permissions`) · Cấu hình quy tắc (`config`) · Công thức lương (`formula`) · Audit log (`audit`) | chỉ super (permissions/config/formula); audit super/hr |
| **Hệ thống** | Đăng nhập (`login`) · Tài khoản (`account`) · Chuông thông báo | tất cả |

Header mọi màn: ô tìm kiếm toàn cục · chọn tháng · **chuông thông báo** (badge, dropdown, bấm → tới đúng mục việc) · **menu tài khoản** (avatar, tên, vai trò → Tài khoản / Đăng xuất).

---

## 3. ĐẶC TẢ TỪNG PHÂN HỆ (chức năng + tương tác + checklist)

### 3.1 Đăng nhập (`login`)
**Mục đích:** xác thực + là “bộ mặt” thương hiệu, cấu hình được toàn bộ.
**Chức năng:**
- Form **SĐT + mật khẩu**, nút hiện/ẩn mật khẩu, “Ghi nhớ đăng nhập”, “Quên mật khẩu?”.
- Sai thông tin → **thông báo lỗi đỏ**. Đúng → nạp `me` theo vai trò, vào Dashboard/Sơ đồ khung.
- **Dãy tài khoản demo bấm-điền-nhanh** (ẩn được qua config).
- Panel trái: **logo lớn (64px)**, tên app, nhãn hệ thống, tên công ty, mô tả, khối số liệu (81·22·4) — tất cả lấy từ `login_config`.
- Nền: **gradient thương hiệu (6 theme)** hoặc **ảnh nền** (kéo-thả) có **độ mờ 0–16px** + **phủ tối 0–85%**.
**Template:** trang 2 cột (branding | form).
**Checklist:** ☐ đăng nhập đúng/sai ☐ ẩn/hiện mật khẩu ☐ demo quick-login ☐ đọc & áp dụng toàn bộ `login_config` ☐ đổi theme/ảnh nền phản ánh ngay.

### 3.2 Sơ đồ khung (`framework`) — chỉ super/hr
**Mục đích:** bản đồ toàn hệ thống, điểm khởi đầu định hướng.
**Chức năng:** liệt kê các nhóm module + **trạng thái** (Nền tảng / Đang có / Ưu tiên mới / Giai đoạn sau) với chú giải màu; **bấm một module → mở đúng màn**; banner tầm nhìn “Từ app KPI → nền tảng HRM”; khối 81·22·5.
**Checklist:** ☐ mỗi thẻ module click được & điều hướng đúng ☐ chú giải trạng thái ☐ chỉ super/hr thấy.

### 3.3 Dashboard BGĐ (`dashboard`)
**Chức năng:** thẻ số tổng (nhân sự, chấm công, phép chờ duyệt, quỹ lương…); **biểu đồ theo bộ phận** & **theo tuần**; **Top performers** & **Watch list** (từ KPI); nút **Nhập dữ liệu / Xuất báo cáo** (template công ty); **Chốt kỳ 06/2026** — 4 bước tuần tự **Chấm công → Phép năm → KPI → Lương** (mỗi bước khoá dần, phụ thuộc bước trước).
**Tương tác:** bấm thẻ/biểu đồ → drill tới màn liên quan; chốt từng bước hiện trạng thái khoá.
**Checklist:** ☐ số liệu tổng hợp từ dữ liệu thật ☐ 2 biểu đồ ☐ top/watch từ KPI ☐ nhập/xuất ☐ chốt kỳ tuần tự khoá đúng thứ tự.

### 3.4 Nhân viên (`employees`)
**Chức năng:**
- Danh sách **81 nhân sự**, **phân trang 15/trang** (nút Trước/Sau + số trang), tìm kiếm, **lọc bộ phận**, **lọc “Chưa tham gia BH”** + chip cảnh báo.
- **Hover tên → popup nhỏ** (ảnh, họ tên, bộ phận, ngày vào làm, quản lý trực tiếp, trạng thái).
- Nút **Thêm nhân viên** (wizard nhiều bước) · **Nhập dữ liệu** · **Xuất dữ liệu** (đều ẩn nếu không có quyền sửa).
- Bấm dòng → **Hồ sơ nhân viên**.
**Wizard thêm nhân viên (4 bước):** Thông tin cơ bản → Công việc (bộ phận/chức vụ/vị trí/loại HĐ/cấp bậc) → Lương & phụ cấp & người phụ thuộc → (tuỳ chọn) **tạo tài khoản đăng nhập** + vai trò. Có thanh tiến trình, Tiến/Lùi, xác nhận.
**Checklist:** ☐ phân trang thật ☐ tìm + 2 bộ lọc ☐ hover-popup ☐ wizard 4 bước tạo NV ☐ nhập/xuất ☐ gate quyền.

### 3.5 Hồ sơ nhân viên (`employee`) — **6 tab**
**Ảnh 3×4** làm avatar mặc định. Tab (theo thứ tự): **Tổng hợp · Công việc · Cá nhân · Lương & phụ cấp · Bảo hiểm · Hồ sơ (tài liệu)**.
- **Tổng hợp:** dashboard cá nhân + **biểu đồ KPI 6 tháng** (xu hướng tiến bộ/thụt lùi).
- **Công việc:** bộ phận, chức vụ, **vị trí làm việc**, loại HĐ, cấp bậc, ngày vào làm, quản lý trực tiếp, **ngày xin thôi việc & ngày nghỉ chính thức** (trống nếu đang làm; đủ nếu đã nghỉ).
- **Cá nhân (PII):** ngày sinh, giới tính, CCCD, địa chỉ, SĐT, TK ngân hàng, MST — **chỉ hr/super**.
- **Lương & phụ cấp:** lương cơ bản, phụ cấp, số người phụ thuộc, lương đóng BH.
- **Bảo hiểm:** trạng thái BHXH (Đã/Chưa/Đang chờ), mã đơn vị, số sổ BHXH, mã thẻ BHYT, nơi KCB, ngày bắt đầu tham gia.
- **Hồ sơ:** danh sách **file PDF** (CV, đơn xin việc, HĐLĐ, CCCD…); **tải lên** file mới; xoá.
**Chức năng chung:** mỗi tab (trừ Tổng hợp/Hồ sơ) có **Sửa → Lưu/Huỷ** (chỉ canEdit); ô ngày dùng **date-picker**. Nút **Xuất hồ sơ** → bản in chuyên nghiệp (toàn bộ thông tin & lịch sử — mục 5).
**Checklist:** ☐ 6 tab ☐ avatar 3×4 ☐ biểu đồ KPI 6 tháng ☐ sửa-lưu từng tab ☐ PII gate ☐ ngày thôi việc/nghỉ ☐ upload/xoá PDF ☐ date-picker ☐ xuất hồ sơ in.

### 3.6 Sơ đồ tổ chức (`org`)
**Chức năng:** **cây phân cấp** BGĐ → 4 khối → 22 bộ phận. **Bấm một phòng ban → cửa sổ phụ** với các menu: sửa tên phòng, đổi/gán **trưởng đơn vị** (Trưởng phòng/Xưởng trưởng/Tổ trưởng/Tổ phó), **danh sách thành viên**, **chuyển thành viên** sang phòng khác, **đưa khỏi phòng**, thêm bớt nhân sự. Mỗi nút phải hoạt động (không phải nút chết).
**Checklist:** ☐ cây phân cấp rõ ☐ panel phòng ban ☐ sửa tên ☐ gán trưởng ☐ chuyển/xoá thành viên ☐ mọi nút có tác dụng.

### 3.7 Chấm công (`attendance`)
**Chức năng:**
- Bảng công **đủ 81 nhân sự** (mỗi người 1 dòng): Công chuẩn · Công thực · PN · PB · VR · KP · Tăng ca(h).
- **Bộ lọc chuẩn:** tìm tên · lọc bộ phận · 4 cờ nhanh **Tất cả / Có nghỉ / Lệch công / Đã sửa**.
- **Sửa thông số inline** (cột “Sửa” → editor dưới dòng) — dùng khi file nguồn lỗi/nhập sai; **Lưu** ghi đè + đánh dấu “đã sửa”; **↺ Khôi phục dữ liệu gốc**. Chỉ canEdit.
- **Cảnh báo lệch công**: `Công thực ≠ Công chuẩn − (PN+PB+VR+KP)` → tô nền vàng + ⚠; chip đếm “N dòng lệch”, “N dòng đã sửa”.
- **Chốt bảng công** + **ký duyệt 2 cấp** (Tổ trưởng → BGĐ).
- Chú giải mã phép (PN/PB/VR/KP/NL) có màu.
**Checklist:** ☐ 81 dòng ☐ tìm + lọc bộ phận + 4 cờ ☐ sửa inline + khôi phục ☐ cảnh báo lệch + chip đếm ☐ ký 2 cấp ☐ chốt kỳ.

### 3.8 Phép năm (`leave`)
**Chức năng:**
- **Quy tắc & cách trừ quỹ** hiển thị đầu màn.
- **Nút “＋ Tạo đơn nghỉ phép” ở đầu** → **modal** (chọn NV · loại phép PN/PB/VR · stepper số ngày · **preview khấu trừ** & cảnh báo vượt quỹ/định mức) → Gửi → vào hàng chờ.
- **Bảng số dư phép** toàn công ty: Được hưởng · Chuyển sang · Đã dùng · Đang chờ · Khả dụng.
- **Hàng chờ duyệt** với **luồng nhiều cấp** (mục 4.1): hiển thị các bước ● đang / ✓ đã ký / ○ chờ / ✕ từ chối; người duyệt hiện tại; nút **Duyệt / Từ chối** theo cấp.
- **Nghỉ thai sản (TS)** — **card riêng** + nút **“＋ Đăng ký thai sản”** → modal (chọn NV · ngày bắt đầu qua lịch · số con · đính kèm hồ sơ). Hệ thống tự tính **6 tháng + (số con−1) tháng** & **ngày trở lại**. Trạng thái soon/active/returning/done.
**Checklist:** ☐ nút tạo đơn ở đầu + modal ☐ preview khấu trừ ☐ bảng số dư ☐ **duyệt nhiều cấp đúng luật** ☐ Duyệt/Từ chối cập nhật quỹ ☐ card thai sản + modal + tự tính ngày trở lại ☐ date-picker.

### 3.9 Lương thưởng (`salary`) — chỉ super/hr
**Chức năng:**
- **Bảng lương từng nhân viên** app **tự tính theo công thức** (mục 4.2): Lương CB · Công · Lương theo công · Tăng ca · Phụ cấp · Thưởng (KPI+nóng) · Khấu trừ · **Thực nhận**.
- **Lọc theo bộ phận** (bấm bộ phận ở dashboard → lọc bảng).
- **Dashboard lương (cho BGĐ):** tổng thực chi, gross, lương BQ/người, tổng tăng ca, quỹ thưởng, BHXH, thuế; **bảng lương theo bộ phận**. Thông số nghi vấn (công thấp, OT cao, tạm ứng) **bấm truy xuất nhanh** để đối chiếu.
- **Phiếu lương cá nhân** (modal) — thu nhập & khấu trừ chi tiết kèm công thức từng dòng; nút **In phiếu cá nhân**.
- **In phiếu lương tổng** (cho BGĐ kiểm tra & duyệt) — bảng toàn bộ nhân sự + tổng cộng.
**Checklist:** ☐ bảng tính đúng công thức ☐ lọc bộ phận ☐ dashboard lương + drill nghi vấn ☐ phiếu cá nhân (modal + in) ☐ phiếu tổng (in) ☐ template in đồng bộ.

### 3.10 Báo cáo ngày (`report`)
**Chức năng:** form gửi báo cáo cuối ca (nội dung, số lượng, lỗi/NG, ảnh minh chứng) + danh sách báo cáo trong ngày với trạng thái **Đã xác nhận / Chờ xác nhận**.
**Checklist:** ☐ form gửi ☐ danh sách + trạng thái xác nhận.

### 3.11 KPI & Xếp hạng (`kpi`)
**Chức năng:**
- **CRUD điểm KPI**: điểm thành phần **BC/25 · NS/30 · CL/25 · ĐG/20** (tổng 100); **tổng, xếp loại, thứ hạng tự tính**.
- **Sửa inline** từng dòng (editor: 4 điểm + ghi chú/bằng chứng), **Lưu**, **↺ khôi phục gốc**; **＋ Chấm KPI** thêm bản ghi (modal: NV · 4 điểm · ghi chú · tổng preview).
- **Lọc** theo tên + bộ phận; chip **TB kỳ**, chip “N đã sửa”.
- **Ký xác nhận 2 cấp** (Tổ trưởng·QC → BGĐ); **chốt xong → khoá sửa**.
- **Xếp hạng bộ phận** tự tổng hợp trung bình.
- Xếp loại theo tổng: ≥93 Xuất sắc · ≥90 Tốt · ≥83 Khá · ≥70 Đạt · <70 Cần cải thiện.
**Checklist:** ☐ sửa inline + khôi phục ☐ thêm bản ghi ☐ tổng/loại/hạng tự tính ☐ lọc + TB kỳ ☐ ký 2 cấp + khoá ☐ xếp hạng bộ phận auto.

### 3.12 Khen thưởng & Cải thiện (`recognition`)
**Chức năng (đề xuất → duyệt, dựa trên KPI):**
- **Ứng viên tự gợi ý** từ KPI ≥ 90 chưa được thưởng → bấm **Đề xuất** (điền nhanh), hoặc **＋ Đề xuất thưởng** thủ công (modal: NV · lý do · số tiền).
- **Hàng chờ Ban Giám đốc duyệt**: **chỉ super/BGĐ** thấy nút **Duyệt / Từ chối**.
- **Đã duyệt · chi thưởng**: danh sách + **tổng chi kỳ**.
- **Lộ trình cải thiện** tự gợi ý từ KPI < 83 (bước Nhắc nhở/Đào tạo/Cam kết theo mức điểm).
**Checklist:** ☐ gợi ý ứng viên từ KPI ☐ đề xuất (nhanh + thủ công) ☐ duyệt/từ chối gate quyền ☐ tổng chi ☐ lộ trình cải thiện auto.

### 3.13 Payroll đối chiếu (`payroll`)
**Chức năng:** bảng **dựng từ lương app tự tính** so với **file lương import**; thống kê Nhân sự / Tổng chi / Dòng khớp / Dòng lệch (tự đếm); **cột Lệch** tô màu, dòng lệch nền vàng; **bấm một dòng → mở phiếu lương** để đối chiếu; **Xuất Excel** · **Chốt kỳ lương**.
**Checklist:** ☐ đối chiếu app vs file ☐ đếm khớp/lệch tự động ☐ dòng lệch highlight ☐ click drill sang phiếu ☐ xuất/chốt.

### 3.14 Đào tạo & Kỹ năng (`training`)
**Chức năng:** lịch sử đào tạo (nội dung, bộ phận, ngày, giờ, kết quả) + **ma trận kỹ năng** (mức thành thạo ●●●● theo công đoạn).
**Checklist:** ☐ bảng lịch sử ☐ ma trận kỹ năng.

### 3.15 Phân quyền & Vai trò (`permissions`) — chỉ super
**Chức năng:**
- **Ma trận tổng** theo 6 nhóm (Hồ sơ · Chấm công · Phép · KPI · Lương · Cấu hình) — ô ✓/— **bấm bật/tắt**, đếm số quyền.
- **Bấm một vai trò → drill-down chi tiết**: tick từng **hành động theo module** (view/create/approve1/approve2/quota/lock/export…), có “Chọn tất cả / Bỏ chọn”, đếm số quyền, **Lưu** (cảnh báo chưa lưu). Super Admin **khoá bật-hết**.
- **Danh sách tài khoản đăng nhập** (SĐT · tên · vai trò · phạm vi).
**Checklist:** ☐ ma trận tổng bật/tắt ☐ drill-down từng hành động ☐ chọn tất cả/bỏ chọn ☐ Lưu + dirty ☐ super khoá ☐ danh sách tài khoản.

### 3.16 Cấu hình quy tắc (`config`) — chỉ super
**Chức năng:** **(a)** card **Trang đăng nhập** (mục 3.1 — sửa nội dung, 6 theme, ảnh nền + blur/dim, ẩn/hiện demo & số liệu, **Lưu** / Khôi phục mặc định). **(b)** **thông số quy tắc** mở (`DATA_AND_CONFIG.md §3`): phép năm, thâm niên, định mức tháng, carry-over, công chuẩn, hệ số OT, BHXH%, GTGC, thang KPI, số cấp ký — **nạp sẵn chuẩn, sửa được, Lưu / Nạp lại chuẩn**.
**Checklist:** ☐ card login config đầy đủ + Lưu ☐ thông số quy tắc sửa được + Lưu/Reset ☐ tính lại sau khi lưu.

### 3.17 Công thức lương (`formula`) — chỉ super
**Chức năng:**
- **Trình sửa công thức** trực quan: chọn biến (các ô dữ liệu: lương CB, phụ cấp, OT, KPI…), tham số (bhxhRate, GTGC…), toán tử (+ − × ÷), hàm (max/min/round/pit). Ví dụ `Tổng lương = base + allowance + ot_pay + kpi_bonus`.
- Thứ tự tính `gross → ins → taxable → tax → deduct → net` (mục 4.2). **Lưu** áp dụng ngay + audit; **Khôi phục mặc định**.
- **Thuế TNCN (PIT):** **bật/tắt** (không kích hoạt → thuế = 0); bảng bậc luỹ tiến **sửa được** (thêm/xoá bậc, sửa ngưỡng & thuế suất); **Nạp biểu thuế theo luật**; **Lưu**.
**Checklist:** ☐ sửa công thức bằng chọn ô ☐ Lưu/Reset công thức ☐ PIT bật/tắt ☐ sửa bậc thuế ☐ Lưu PIT ☐ bảng lương tính lại theo công thức mới.

### 3.18 Audit log (`audit`) — super/hr
**Chức năng:** nhật ký thay đổi (người, hành động, đối tượng, thời gian, trước/sau).
**Checklist:** ☐ ghi log mọi thao tác ghi dữ liệu ☐ lọc/tra cứu.

### 3.19 Chuông thông báo (header)
**Chức năng:** badge số chưa đọc; dropdown danh sách (đơn phép chờ, bảng công chờ ký, cảnh báo BH, KPI đã ký…); **bấm một thông báo → điều hướng thẳng tới đúng mục việc** (chặn nếu vai trò không có quyền); “Đánh dấu tất cả đã đọc”.
**Checklist:** ☐ badge ☐ dropdown ☐ click → đúng màn ☐ gate quyền ☐ đánh dấu đã đọc.

### 3.20 Tài khoản (`account`) & Đăng xuất
**Chức năng:** thông tin tài khoản (avatar, tên, vai trò, phạm vi, SĐT), phiên đăng nhập, hoạt động gần đây, **Đăng xuất** (về login).
**Checklist:** ☐ hiển thị đúng theo tài khoản ☐ đăng xuất.

---

## 4. QUY TẮC NGHIỆP VỤ (viết rõ để không hiểu sai)

### 4.1 Duyệt đơn nghỉ phép (nhiều cấp)
- **≤ 1 ngày** → 1 cấp: **Tổ trưởng**.
- **2–3 ngày** → 2 cấp: **Tổ trưởng → HR**.
- **> 3 ngày**, hoặc **vượt quỹ phép**, hoặc **VR không lương**, hoặc **vượt định mức tháng** → 3 cấp: **Tổ trưởng → HR → BGĐ**.
- **Phép ốm (PB):** cần giấy tờ y tế, HR xác minh; **không trừ quỹ phép năm**.
- **Nguyên tắc:** người duyệt ≠ người tạo đơn; SLA 24h/cấp; **quỹ chỉ trừ khi duyệt xong cấp cuối** (đơn chờ tạm giữ số ngày).
- **Trừ quỹ:** PN & VR trừ quỹ phép năm; vượt khả dụng → phần vượt **không lương**. PB/TS/NL không trừ.
- **Định mức tháng:** > `monthCap` ngày PN/tháng → cần duyệt ngoại lệ (còn nhiều phép / ứng trước) · cần BGĐ.

### 4.2 Tính lương (thứ tự bắt buộc)
```
workSalary = base ÷ stdDays × congThuc
otPay      = base ÷ stdDays ÷ 8 × (otWeekday_h × otWeekday + otSunday_h × otSunday)
gross      = workSalary + otPay + allowance + kpiBonus + hotBonus
ins        = insSalaryBase × bhxhRate%          (phần người lao động)
taxable    = max(gross − ins − gtgcSelf − dependents × gtgcDep, 0)
tax        = pit(taxable)                         (luỹ tiến; = 0 nếu PIT tắt)
deduct     = ins + tax + advance
net        = gross − deduct
```
- **pit(taxable):** luỹ tiến từng phần theo bảng bậc (`DATA_AND_CONFIG.md §5`); có công tắc bật/tắt.
- Biến `base/allowance/dependents/insSalaryBase` đọc từ **hồ sơ**; `cong/OT` từ **chấm công**; `kpiBonus` từ **KPI**; `advance` từ tạm ứng.

### 4.3 Thai sản
`số tháng nghỉ = 6 + (số con − 1)`; `ngày trở lại = ngày bắt đầu + số tháng` (ngày kết thúc = trở lại − 1 ngày). Lương công ty = 0 trong kỳ (BHXH chi trả); không trừ phép năm; đánh dấu **TS** trên bảng công.

### 4.4 Xếp loại KPI
Tổng = BC+NS+CL+ĐG (max 100). ≥93 Xuất sắc · ≥90 Tốt · ≥83 Khá · ≥70 Đạt · <70 Cần cải thiện.

### 4.5 Khen thưởng
Ứng viên = KPI ≥ 90 chưa được thưởng kỳ. Đề xuất (hr/lead) → **BGĐ/super duyệt/từ chối**. Cải thiện = KPI < 83.

### 4.6 Chốt kỳ & ký duyệt
Kỳ theo tháng; 4 bước tuần tự **Chấm công → Phép → KPI → Lương**, bước sau phụ thuộc bước trước. Ký 2 cấp (Tổ trưởng → BGĐ) cho Chấm công & KPI. Chốt xong → khoá sửa dữ liệu kỳ đó.

---

## 5. TEMPLATE ÁP DỤNG (bộ nhận diện & in ấn)

**Thương hiệu:** tông **navy `#0f2f5a` → `#1e6fd0`**, phụ trợ than chì `#5c6a7a`, cam nhấn `#ef7c15`, xanh OK `#1f7a4d`, vàng cảnh báo `#c1852a`, đỏ lỗi `#c0483c`. Nền app `#eef2f6`, thẻ trắng bo 12–16px, viền `#e2e7ee`. Font UI hệ thống; **số tiền/mã dùng monospace (IBM Plex Mono)**. Logo “Cơ khí Tiến Huy” ở sidebar & bản in.

**Template in — dùng CHUNG cho mọi bản in (đồng bộ):**
1. **Header in:** logo + tên công ty đầy đủ + tiêu đề tài liệu + kỳ + mã/ngày in.
2. **Thân:** bảng/thông tin theo tài liệu.
3. **Footer:** người lập / người duyệt (ô ký) + số trang.
Áp dụng cho: **Hồ sơ nhân viên (xuất)**, **Phiếu lương cá nhân**, **Phiếu lương tổng (BGĐ)**, **Báo cáo điều hành (Dashboard xuất)**. Kích thước A4, in sạch (không URL/ngày trình duyệt).

**Nhập/Xuất dữ liệu:** template Excel/CSV chuẩn có logo & tiêu đề cột rõ ràng (nhân viên, chấm công, lương). Xuất giữ đúng thứ tự cột như bảng trên app.

---

## 6. ACCEPTANCE CHECKLIST (tiêu chí nghiệm thu — Claude Code phải pass hết)

**Nền tảng:** ☐ đăng nhập SĐT+mật khẩu, vai trò theo tài khoản ☐ sidebar/nút/PII ẩn-hiện đúng 4 vai trò ☐ read-only banner ☐ audit log ghi mọi thao tác ghi ☐ chọn tháng ☐ date-picker mọi ô ngày ☐ toast xác nhận.

**Từng phân hệ:** mỗi màn ở mục 3 phải **pass toàn bộ checklist con** — đặc biệt các thao tác hay bị bỏ: **sửa inline (chấm công, KPI), modal (tạo đơn phép, thai sản, chấm KPI, đề xuất thưởng, phiếu lương), duyệt nhiều cấp (phép), ký 2 cấp (công/KPI), drill-down (phân quyền, payroll→phiếu), phân trang thật (nhân viên), hover-popup, upload PDF, 6 tab hồ sơ, wizard thêm NV, cấu hình mở (config/formula/PIT), org panel mọi nút hoạt động.**

**Nghiệp vụ:** ☐ duyệt phép đúng số cấp theo luật 4.1 ☐ trừ quỹ đúng ☐ lương tính đúng thứ tự 4.2 ☐ PIT bật/tắt ☐ thai sản tự tính ngày trở lại ☐ KPI tổng/loại/hạng tự tính ☐ khen thưởng gate BGĐ ☐ payroll đối chiếu đếm khớp/lệch ☐ chốt kỳ tuần tự.

**In & dữ liệu:** ☐ 4 loại bản in dùng chung template ☐ nhập/xuất Excel/CSV theo template.

> **Khuyến nghị:** khi Claude Code báo “đã xong một màn”, đối chiếu lại checklist con của màn đó ở mục 3 + phần liên quan ở mục 6. Nếu thiếu bất kỳ thao tác con nào (modal/inline/duyệt/drill/print) → **chưa đạt**.
