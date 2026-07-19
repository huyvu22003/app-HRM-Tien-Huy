# Thiết kế sơ đồ tổ chức gọn và dễ đọc

## Mục tiêu

Thiết kế lại phân hệ sơ đồ tổ chức để:

- Sơ đồ tổng không còn dàn toàn bộ nhân sự thành một hàng rất dài.
- Chữ và ô luôn đủ lớn để đọc, không phụ thuộc vào việc thu nhỏ trang.
- Các quan hệ cấp trên–cấp dưới luôn có đường nối rõ ràng.
- Mỗi phòng ban có sơ đồ nhân sự riêng, bắt đầu từ Trưởng phòng hoặc Tổ trưởng cao nhất.
- Danh sách nhân viên đông được gom gọn nhưng vẫn dễ tìm và mở hồ sơ.

## Đồng bộ trước khi triển khai

- Nhánh `main` đã chứa phiên bản sơ đồ tổ chức đầu tiên qua PR #23.
- Commit `main` đã xác nhận trên GitHub khi viết đặc tả: `c2c6e130c7ab7f0bcfb244aa591dcce7f78c8fd2`.
- Checkout cục bộ dùng để viết đặc tả bắt đầu từ `87ff644917810f5c9fa70d60d1e5dfc490bfbb45`.
- Trước khi sửa mã nguồn, người triển khai phải fetch và tích hợp `main` mới nhất vào nhánh làm việc.
- Không ghi đè thay đổi đồng thời trong `org-screen.tsx`, `org-chart-canvas.tsx`, `src/lib/api.ts`, `src/lib/mock-api.ts` hoặc API nhân sự.

## Quyết định thiết kế

Người dùng chọn phương án **cây phòng ban phẳng**:

- Ban Giám đốc nằm ở nút cao nhất.
- Tất cả phòng ban nằm trực tiếp bên dưới.
- Phòng ban tự chia thành nhiều hàng theo chiều rộng vùng hiển thị.
- Mỗi ô phòng ban chỉ hiển thị tên và số lượng nhân viên.
- Bấm phòng ban để mở sơ đồ nhân sự riêng của phòng đó.

Sơ đồ tổng không hiển thị nhân viên và không có tab “Nhân sự toàn công ty” dạng cây.

## Sơ đồ tổng

### Nội dung

Nút Ban Giám đốc hiển thị ở chính giữa phía trên. Bên dưới là lưới phòng ban, mỗi ô gồm:

- Tên phòng ban.
- Số lượng nhân viên.
- Trạng thái thiếu Trưởng phòng nếu có.

Không hiển thị ảnh, tên cá nhân, chức vụ hoặc số điện thoại trên sơ đồ tổng.

### Bố cục

- Lưới dùng kích thước ô cố định đủ đọc.
- Số cột tự thay đổi theo chiều rộng, ưu tiên 3–4 ô mỗi hàng trên màn hình desktop.
- Khi số phòng ban tăng, lưới xuống hàng theo chiều dọc thay vì kéo dài theo chiều ngang.
- Không dùng phép biến đổi `scale()` để ép toàn bộ sơ đồ vừa màn hình.
- Không cần thanh cuộn ngang trong trường hợp thông thường.

### Đường nối

Một lớp SVG phủ trên vùng sơ đồ vẽ đường từ Ban Giám đốc tới từng hàng và từng phòng ban.

Tọa độ được tính từ vị trí thực tế của các phần tử sau khi trình duyệt bố trí lưới. Đường nối được tính lại khi:

- Kích thước vùng chứa thay đổi.
- Danh sách phòng ban thay đổi.
- Sidebar hoặc panel được mở/đóng.
- Font hoặc nội dung làm thay đổi kích thước ô.

## Sơ đồ chi tiết phòng ban

### Nút gốc

Nút gốc được xác định theo thứ tự:

1. `head_employee_id` của phòng ban.
2. Nhân sự có chức vụ Trưởng phòng và không có quản lý trong cùng phòng.
3. Tổ trưởng cấp cao nhất trong phòng.
4. Nếu không tìm được, hiển thị trạng thái “Chưa xác định Trưởng phòng” và nhóm nhân sự chưa được phân cấp.

Không tự chọn một nhân viên thường làm nút gốc.

### Các cấp quản lý

- Chỉ các nhân sự có cấp dưới hoặc chức vụ quản lý được dựng thành nút trên cây.
- Cây đi từ trên xuống dưới.
- Mỗi nút quản lý hiển thị ảnh, tên, chức vụ và số điện thoại nếu có.
- Bấm nút mở hồ sơ nhanh.
- HR/Super thấy nút chỉnh sửa nhánh; quyền và các ràng buộc hiện tại được giữ nguyên.

### Nhân viên thường

Nhân viên không có cấp dưới không được dàn thành hàng dài. Họ được gom theo người quản lý trực tiếp thành một nút:

> N nhân viên

Bấm nút này mở panel bên phải gồm:

- Tên quản lý trực tiếp.
- Tổng số nhân viên.
- Ô tìm kiếm theo tên, mã nhân viên hoặc chức vụ.
- Danh sách ảnh, tên, chức vụ và số điện thoại.
- Bấm một người để mở hồ sơ nhanh.

Trên màn hình nhỏ, panel chuyển thành popup toàn màn hình.

### Người chưa xác định quản lý

Những người không thể gắn an toàn vào cây được hiển thị trong nhóm cảnh báo riêng. Họ không bị ẩn hoặc tự gắn vào một quản lý suy đoán.

## Điều khiển và khả năng di chuyển

Sơ đồ chi tiết hỗ trợ:

- Giữ chuột và kéo vùng sơ đồ.
- Thanh cuộn ngang và dọc luôn hiển thị khi nội dung vượt vùng chứa.
- Nút “Về trung tâm”.
- Nút “Thu gọn tất cả”.
- Nút mở rộng từng nhánh quản lý.

Loại bỏ cơ chế zoom nhỏ đến mức chữ không đọc được. Nếu vẫn giữ zoom, giới hạn dưới phải đảm bảo nội dung thẻ còn đọc được và zoom không được dùng làm giải pháp cho bố cục quá rộng.

## Kiến trúc giao diện

Tách trách nhiệm thành các phần:

- `CompanyDepartmentChart`: sơ đồ tổng và đường nối phòng ban.
- `DepartmentManagementChart`: cây quản lý của một phòng ban.
- `ChartConnectorLayer`: đo vị trí nút và vẽ đường nối SVG.
- `ManagementNodeCard`: thẻ Trưởng phòng/Tổ trưởng/quản lý.
- `EmployeeGroupNode`: nút “N nhân viên”.
- `EmployeeGroupPanel`: tìm kiếm và danh sách nhân viên thuộc một quản lý.
- Logic chuyển đổi dữ liệu đặt trong `src/lib/org-hierarchy.ts`, không đặt trong component giao diện.

Thay `OrgChartCanvas` hiện tại bằng các component chuyên trách trên. Không tiếp tục mở rộng một component đệ quy vừa bố trí cây, vừa zoom, vừa vẽ node và vừa quản lý panel.

## Dữ liệu và API

Không thay đổi mô hình quan hệ `manager_employee_id` hoặc các thao tác `move`, `insert`, `remove-level`.

Sơ đồ tổng sử dụng:

- Danh sách phòng ban.
- `employee_count`.
- `head_employee_id`.

Sơ đồ phòng ban sử dụng:

- Nhân sự được lọc theo `department_id`.
- `manager_employee_id`.
- Chức vụ và dữ liệu hồ sơ hiện có.

Thay đổi này chủ yếu là chuyển đổi dữ liệu phía frontend và bố cục giao diện. Chỉ thay API nếu kiểm tra triển khai cho thấy response hiện tại thiếu dữ liệu bắt buộc.

## Trạng thái lỗi và dữ liệu bất thường

- Không có phòng ban: hiển thị empty state.
- Phòng ban không có nhân sự: hiển thị phòng ban trên sơ đồ tổng và empty state trong chi tiết.
- Thiếu Trưởng phòng: hiển thị cảnh báo cấu hình.
- Quan hệ tạo vòng lặp: cắt vòng an toàn và đưa các nút bị ảnh hưởng vào nhóm cảnh báo.
- Nhiều ứng viên Trưởng phòng: ưu tiên `head_employee_id`; nếu thiếu thì không lựa chọn tùy tiện giữa các ứng viên ngang cấp.
- Lỗi tải dữ liệu: giữ thông báo lỗi và nút thử lại, không hiển thị sơ đồ rỗng như dữ liệu hợp lệ.

## Khả năng đáp ứng

- Desktop: sidebar phòng ban, vùng sơ đồ và panel nhân viên bên phải.
- Tablet: sidebar được thu gọn bằng nút điều khiển; panel nhân viên phủ lên một phần vùng sơ đồ.
- Mobile: sơ đồ tổng thành lưới một cột hoặc hai cột; chi tiết quản lý cuộn được; panel thành popup toàn màn hình.

## Kiểm thử

### Logic

- Xác định đúng Trưởng phòng từ `head_employee_id`.
- Fallback đúng sang Trưởng phòng hoặc Tổ trưởng cao nhất.
- Không chọn nhân viên thường làm gốc.
- Gom đúng nhân viên theo quản lý trực tiếp.
- Không làm mất người chưa xác định quản lý.
- Cắt vòng lặp an toàn.
- Sau thao tác đổi/chèn/gỡ quản lý, cây và nhóm nhân viên được tính lại đúng.

### Giao diện

- Sơ đồ tổng có 1, 4, 12 và hơn 20 phòng ban vẫn không phải thu nhỏ chữ.
- Phòng ban tự xuống hàng.
- Đường nối đúng sau resize và mở/đóng panel.
- Phòng có 60 nhân viên dưới một quản lý không tạo hàng ngang 60 thẻ.
- Panel tìm kiếm hoạt động theo tên, mã và chức vụ.
- Bấm phòng ban, quản lý và nhân viên mở đúng thông tin.
- Thanh cuộn và thao tác kéo chuột không cản trở việc bấm thẻ.
- Giao diện desktop, tablet và mobile không che mất nội dung.

### Xác minh trước bàn giao

- Chạy test logic.
- Chạy typecheck frontend và backend.
- Chạy lint; không thêm lỗi mới.
- Kiểm thử trình duyệt với dữ liệu đông và kích thước màn hình khác nhau.

## Ngoài phạm vi

- Không thay đổi quy trình tạo nhân viên.
- Không cho thêm người trực tiếp từ sơ đồ.
- Không thay `manager_employee_id` bằng liên kết theo tên.
- Không xây hệ thống kéo-thả tự do toàn bộ sơ đồ trong lần này.
- Không thay đổi quyền HR/Super hiện tại.
