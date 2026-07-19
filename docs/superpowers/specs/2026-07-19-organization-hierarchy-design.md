# Thiết kế sơ đồ phân cấp tổ chức

## 1. Mục tiêu

Nâng cấp phân hệ **Sơ đồ tổ chức** từ danh sách nhân viên phẳng thành các cây phân cấp quản lý có thể xem và chỉnh sửa:

- Mỗi phòng ban có một cây riêng, hiển thị từ cấp quản lý cao xuống nhân viên.
- Có mục **Sơ đồ tổng** cho toàn công ty, nằm trên **Ban Giám đốc** trong cây điều hướng bên trái.
- Người dùng có thể bấm vào người hoặc phòng ban để xem thông tin nhanh.
- HR và Super Admin có thể thay đổi quan hệ quản lý trực tiếp trên nhánh sơ đồ mà không tạo nhân viên mới tại đây.

## 2. Phạm vi

### 2.1. Sơ đồ phòng ban

Khi chọn một phòng ban bên trái, khu vực bên phải hiển thị cây của riêng phòng ban đó. Quan hệ cha-con ưu tiên dữ liệu quản lý đã lưu trong hồ sơ nhân viên.

Mỗi ô nhân sự hiển thị:

- Ảnh đại diện hoặc chữ viết tắt khi chưa có ảnh.
- Họ tên.
- Chức vụ.

### 2.2. Sơ đồ tổng

Thêm một mục chọn độc lập tên **Sơ đồ tổng** ở đầu cây bên trái, ngay phía trên **Ban Giám đốc**.

Khu vực nội dung có hai tab:

1. **Nhân sự toàn công ty**
   - Giám đốc ở cấp cao nhất.
   - Dưới Giám đốc là trưởng phòng hoặc các cấp quản lý.
   - Tiếp theo là tổ trưởng và nhân viên theo quan hệ quản lý.
   - Ô quản lý và tổ trưởng có thêm số điện thoại. Các ô khác vẫn có ảnh, tên và chức vụ.
2. **Phòng ban**
   - Ban Giám đốc là nút gốc.
   - Các phòng ban là các nút con trực tiếp.
   - Bấm phòng ban mở popup thông tin và có thể chuyển sang cây riêng của phòng đó.

Hai sơ đồ dùng tab chuyển đổi, không xếp dọc trên cùng một trang.

### 2.3. Popup hồ sơ nhân viên

Bấm vào ô nhân sự mở popup nhanh gồm:

- Ảnh, họ tên và mã nhân viên.
- Chức vụ và phòng ban.
- Số điện thoại và email.
- Người quản lý.
- Trạng thái làm việc.
- Nút **Xem hồ sơ đầy đủ** chuyển tới màn hình hồ sơ nhân viên hiện có.

Đổi tab hoặc đổi phòng ban sẽ đóng popup đang mở.

### 2.4. Popup phòng ban

Bấm vào nút phòng ban trong sơ đồ phòng ban toàn công ty mở popup gồm:

- Tên phòng ban.
- Khối trực thuộc.
- Trưởng phòng hoặc người quản lý.
- Tổng số nhân sự.
- Danh sách nhân viên.
- Nút **Xem sơ đồ phòng ban** chọn phòng ban đó ở cây bên trái.

## 3. Nguồn dữ liệu và quy tắc dựng cây

### 3.1. Quan hệ quản lý ổn định

Bổ sung quan hệ `manager_employee_id` nullable vào dữ liệu nhân viên. Đây là khóa ngoại tự tham chiếu tới nhân viên quản lý trực tiếp.

API nhân viên trả thêm:

- `manager_employee_id`
- `manager_name`

Trường tên quản lý cũ được giữ trong giai đoạn chuyển tiếp để các màn hình hiện tại không bị hỏng. Các thao tác mới ghi theo ID và đồng bộ tên hiển thị tương ứng.

### 3.2. Chuyển dữ liệu cũ

Dữ liệu có tên quản lý cũ được chuyển sang ID khi:

- Tên đã chuẩn hóa khớp đúng một nhân viên.
- Người quản lý không phải chính nhân viên đó.
- Việc gán không tạo vòng lặp.

Nếu không khớp, khớp nhiều người hoặc tạo vòng lặp, nhân viên được đưa vào nhánh **Chưa xác định quản lý** để vẫn xuất hiện trên sơ đồ.

### 3.3. Cây phòng ban

- Chỉ dùng quan hệ quản lý giữa các nhân viên thuộc phòng ban đang chọn.
- `head_employee_id` của phòng ban là nút gốc ưu tiên.
- Nếu chưa có trưởng phòng được gán, chọn người không có quản lý hợp lệ trong phòng và có chức vụ quản lý cao nhất.
- Các gốc còn lại nằm trong nhánh **Chưa xác định quản lý**.

### 3.4. Cây toàn công ty

- Nhân viên thuộc Ban Giám đốc và có chức vụ Giám đốc là nút gốc ưu tiên.
- Trưởng các phòng ban được nối dưới Giám đốc.
- Các cấp còn lại theo `manager_employee_id`.
- Nếu chưa có Giám đốc hợp lệ, giao diện hiển thị cảnh báo cấu hình và vẫn hiển thị các nhánh chưa xác định.

### 3.5. An toàn cấu trúc

Trình dựng cây phải:

- Phát hiện và cắt vòng lặp.
- Không làm mất nhân viên khi dữ liệu thiếu hoặc sai.
- Dùng ID làm khóa; không dùng tên làm định danh.
- Cho kết quả ổn định khi nhiều nút cùng cấp.

## 4. Chỉnh sửa trực tiếp trên sơ đồ

### 4.1. Quyền

Chỉ vai trò `super` và `hr` thấy nút **Chỉnh sửa sơ đồ** và các thao tác thay đổi nhánh. Các vai trò khác chỉ được xem và mở popup.

### 4.2. Nguồn nhân viên

Sơ đồ không tạo hồ sơ nhân viên mới. Người được thêm hoặc chuyển nhánh phải tồn tại trong danh mục nhân viên và dùng chức vụ đang lưu trong hồ sơ.

Nếu cần người mới hoặc đổi chức vụ, người dùng phải thực hiện tại phân hệ nhân viên trước, sau đó quay lại sơ đồ.

### 4.3. Các thao tác

Khi bật chế độ chỉnh sửa và chọn một ô:

- **Thêm cấp dưới:** chọn một nhân viên có sẵn trong cùng phòng ban rồi gán nút đang chọn làm quản lý.
- **Chèn cấp quản lý:** chọn một nhân viên có chức vụ quản lý phù hợp; người này nhận quản lý cũ của nhánh làm quản lý trực tiếp, còn gốc nhánh được chuyển xuống dưới người mới.
- **Đổi quản lý:** chuyển nút và toàn bộ nhánh con sang một quản lý hợp lệ khác.
- **Gỡ cấp quản lý:** không xóa hồ sơ; các cấp dưới trực tiếp chuyển lên quản lý phía trên. Người bị gỡ vẫn thuộc phòng ban và ở cùng cấp cho đến khi được phân công lại.

Trước khi lưu, hộp xác nhận phải nêu rõ:

- Người được thêm, chuyển hoặc gỡ.
- Quản lý cũ và quản lý mới.
- Số cấp dưới trực tiếp bị ảnh hưởng.

### 4.4. Lọc danh sách quản lý

Danh sách chọn quản lý chỉ hiển thị người:

- Có trong danh mục nhân viên.
- Có chức vụ thuộc nhóm quản lý được cấu hình.
- Cùng phòng ban đối với cây phòng ban.
- Không phải chính nhân viên đang sửa.
- Không nằm trong cây con của nhân viên đang sửa.
- Không làm phát sinh vòng lặp.

Việc phân loại chức vụ quản lý dùng một hàm cấu hình tập trung dựa trên `position` và `level`, không rải điều kiện chuỗi trong nhiều component.

### 4.5. Cập nhật đồng thời

API kiểm tra phiên bản hoặc thời điểm cập nhật trước khi ghi. Nếu người khác đã sửa cấu trúc, thao tác bị từ chối với thông báo tải lại sơ đồ, tránh ghi đè âm thầm.

## 5. Giao diện và khả năng sử dụng

- Cây đi từ trên xuống dưới, đường nối trung tính và rõ nhánh.
- Khu vực sơ đồ có cuộn ngang khi rộng.
- Có nút **Thu nhỏ**, **Phóng to** và **Vừa màn hình**.
- Trạng thái phòng trống, không có Giám đốc và nhánh chưa xác định có thông báo rõ ràng.
- Các ô và nút thao tác dùng được bằng bàn phím, có nhãn truy cập.
- Trên màn hình nhỏ, thanh điều khiển xuống dòng; popup vừa chiều rộng màn hình; sơ đồ vẫn cuộn ngang thay vì ép các ô quá nhỏ.

## 6. Kiến trúc thành phần

- `OrgHierarchyBuilder`: hàm thuần dựng cây, xác định gốc, phát hiện vòng lặp và trả nhánh chưa xác định.
- `OrgChartCanvas`: trình bày cây, đường nối, cuộn và thu phóng.
- `EmployeeOrgNode`: ô nhân sự và điểm mở thao tác.
- `DepartmentOrgNode`: ô phòng ban.
- `EmployeeQuickProfileModal`: hồ sơ nhanh và điều hướng tới hồ sơ đầy đủ.
- `DepartmentInfoModal`: thông tin phòng ban và điều hướng tới cây riêng.
- `OrgChartEditor`: chọn thao tác, lọc ứng viên, xác nhận ảnh hưởng và gọi API.

`org-screen.tsx` giữ trách nhiệm tải dữ liệu, chọn chế độ/phòng ban và phối hợp các thành phần; logic dựng cây và chỉnh sửa không đặt trực tiếp trong file màn hình.

## 7. Luồng dữ liệu

1. Màn hình tải phòng ban và toàn bộ nhân viên.
2. Dữ liệu được chuẩn hóa theo ID và chuyển cho `OrgHierarchyBuilder`.
3. Bộ dựng cây trả cây hợp lệ, danh sách nút chưa xác định và cảnh báo dữ liệu.
4. Canvas hiển thị cây đang chọn.
5. Bấm nút mở popup chỉ đọc.
6. Trong chế độ chỉnh sửa, editor lọc ứng viên ở client để phản hồi nhanh.
7. API kiểm tra lại quyền, phòng ban, chức vụ, vòng lặp và tính đồng thời trước khi lưu.
8. Lưu thành công thì tải lại dữ liệu và dựng lại cây từ nguồn chuẩn.

## 8. Xử lý lỗi

- Không tải được nhân viên hoặc phòng ban: giữ khung màn hình và cho phép thử lại.
- Không lưu được quan hệ: giữ hộp chỉnh sửa, hiển thị lỗi cụ thể, không thay đổi cây giả.
- Dữ liệu tạo vòng lặp hoặc quản lý không hợp lệ: API từ chối; UI nêu lý do.
- Nhân viên đã chuyển phòng trong lúc chỉnh sửa: API từ chối và yêu cầu tải lại.
- Ảnh lỗi: dùng chữ viết tắt.

## 9. Kiểm thử

### 9.1. Unit

- Cây một cấp, nhiều cấp, nhiều gốc và phòng trống.
- Chuyển tên quản lý cũ sang ID khi khớp duy nhất.
- Tên thiếu, tên trùng, quản lý ngoài phòng và vòng lặp.
- Xác định trưởng phòng dự phòng.
- Lọc ứng viên quản lý và loại toàn bộ hậu duệ.
- Chèn cấp, đổi quản lý và gỡ cấp có nhiều cấp dưới.

### 9.2. Component

- Chuyển giữa Sơ đồ tổng và phòng ban.
- Chuyển hai tab của Sơ đồ tổng.
- Mở/đóng hai loại popup và điều hướng đúng.
- Quyền xem so với quyền chỉnh sửa.
- Xác nhận thay đổi nhánh và thông báo lỗi.
- Thu phóng, vừa màn hình và giao diện hẹp.

### 9.3. API

- Chỉ HR/Super Admin được ghi.
- Không cho tự quản lý, quản lý là hậu duệ, sai phòng ban hoặc chức vụ không hợp lệ.
- Không ghi đè khi phiên bản dữ liệu đã thay đổi.
- Gỡ cấp chuyển đúng các cấp dưới trực tiếp.

## 10. Không nằm trong phạm vi đợt này

- Tạo nhân viên mới ngay trên sơ đồ.
- Sửa chức vụ ngay trên sơ đồ.
- Kéo-thả tự do giữa các nhánh.
- Lịch sử phiên bản đầy đủ và khôi phục cấu trúc theo thời điểm.
- Sơ đồ ma trận với một người có nhiều quản lý đồng thời.

Các mục này có thể phát triển sau khi quan hệ `manager_employee_id` và API kiểm tra cấu trúc đã ổn định.

## 11. Quy tắc đồng bộ và bàn giao

Trước mỗi đợt sửa:

1. Fetch đầu nhánh GitHub và chỉ fast-forward.
2. Kiểm tra `git status`, commit gần nhất và các file đang được người khác sửa.
3. Không ghi đè thay đổi chưa rõ nguồn.

Sau mỗi đợt sửa:

1. Ghi commit nền, commit kết quả và danh sách file thay đổi trong `docs/HANDOFF.md`.
2. Ghi migration, lệnh kiểm thử và vấn đề còn lại.
3. Đẩy commit nhỏ, có mục đích rõ để Claude Code hoặc Codex tiếp theo tiếp tục an toàn.
