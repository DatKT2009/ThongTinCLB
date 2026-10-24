# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ THÔNG TIN CLB TNTN TRỐNG ĐỒNG
**TRƯỜNG CAO ĐẲNG LONG AN - CƠ SỞ ĐỨC HOÀ**  
**ĐOÀN BỘ PHẬN CƠ SỞ ĐỨC HOÀ**

---

## 📌 GIỚI THIỆU CHUNG
Hệ thống được xây dựng chuyên biệt phục vụ công tác **quản lý, lưu trữ, thu thập thông tin của Cộng tác viên (CTV) và Thành viên** trong Câu lạc bộ Thanh niên Tình nguyện (TNTN) Trống Đồng trực thuộc Đoàn Bộ phận Cơ sở Đức Hoà.

Hệ thống hoạt động trực tiếp trên trình duyệt web (Google Chrome, Microsoft Edge, Cốc Cốc, Firefox, Safari trên cả máy tính lẫn điện thoại di động) mà **không cần cài đặt thêm bất kỳ phần mềm lập trình nào** (không cần Node.js hay Python).

---

## 🚀 CÁCH KHỞI CHẠY HỆ THỐNG
1. **Cách 1 (Nhanh nhất)**: Nhấp đúp chuột trái vào file `Mo_Ung_Dung.bat` trong thư mục `D:\ANTIGRAVITY\Dự án 01`.
2. **Cách 2**: Nhấp đúp chuột trực tiếp vào file `index.html`. Trình duyệt sẽ tự động mở ứng dụng.

---

## 🌟 CÁC TÍNH NĂNG CHÍNH

### 1. 📊 Tổng Quan & Thống Kê (Dashboard)
- **Thẻ chỉ số tức thời (KPIs)**:
  - Tổng quân số toàn CLB.
  - Số lượng Cộng tác viên (CTV).
  - Số lượng Thành viên chính thức.
  - Số lượng cán bộ Ban Chủ nhiệm (BCN) & Cán bộ ban.
  - Số lượng đang hoạt động tích cực.
- **Biểu đồ trực quan (Chart.js)**:
  - Biểu đồ tròn: Cơ cấu nhân sự theo các Ban sinh hoạt (*Ban Chủ nhiệm, Ban Nhân sự, Ban Thư ký, Ban Truyền thông, Ban Thể thao, Ban Hậu cần, Ban Văn nghệ, Ban Quản lý VPĐ*).
  - Biểu đồ phân loại: Tỷ lệ CTV vs Thành viên chính thức vs BCN.
  - Biểu đồ cột: Tỷ lệ giới tính Nam / Nữ.

### 2. 👥 Danh Sách & Quản Lý Thành Viên (Members Management)
- **Tìm kiếm thông minh**: Gõ từ khóa tìm theo Họ tên, MSSV, SĐT, Lớp, Ngành... Kết quả cập nhật tức thì theo thời gian thực.
- **Bộ lọc đa tiêu chí**:
  - Lọc theo từng Ban cụ thể (Ban Chủ nhiệm, Ban Nhân sự, Ban Thư ký, Ban Truyền thông, Ban Thể thao, Ban Hậu cần, Ban Văn nghệ, Ban Quản lý VPĐ).
  - Lọc theo Cấp bậc / Vai trò: BCN, Thành viên chính thức, CTV, Cố vấn, Cựu Chủ nhiệm, Cựu ban điều hành, Cựu thành viên, Cựu Cộng tác viên.
  - Lọc theo Trạng thái hoạt động: Đang hoạt động, Tạm vắng, Đang đi NVQS, Đã trưởng thành CLB, Đã rời CLB, Chờ xét duyệt.
- **Duyệt nhanh CTV**: Nút "Duyệt" ngay tại hàng của Cộng tác viên để nâng cấp lên Thành viên chính thức chỉ với 1 click!
- **🔍 Xem & Kiểm Tra Ảnh Đại Diện To Rõ (Mới)**:
  - Bấm trực tiếp vào **ảnh đại diện tròn** của bất kỳ thành viên nào (tại Bảng danh sách, Thẻ hồ sơ, Popup xét duyệt, hoặc Form đăng ký/sửa).
  - Hệ thống sẽ mở ngay cửa sổ **"Kiểm Tra Ảnh Đại Diện & Thông Tin Thành Viên"**:
    + **Bên trái**: Hiển thị ảnh đại diện kích thước lớn, sắc nét, có bộ công cụ: **Phóng to (+)**, **Thu nhỏ (-)**, **Xoay ảnh 90°**, **Đặt lại kích thước gốc**, và nút **Tải ảnh về máy**.
    + **Bên phải**: Hiển thị đầy đủ, to rõ các thông tin sinh viên để tiện đối chiếu và kiểm tra tính xác thực (Họ tên, MSSV kèm nút copy nhanh, Lớp, Ngành, SĐT, Email, Quê quán, Facebook, Tiêu chí ảnh chuẩn CLB).
    + Có phím tắt tiện lợi: Bấm `Esc` để đóng, `+` hoặc `-` để zoom, `R` để xoay ảnh.
- **Hồ sơ chi tiết & Thẻ Thành viên**:
  - Bấm vào tên hoặc biểu tượng thẻ `ID-card` để mở hồ sơ đầy đủ.
  - Hệ thống tự động render **Thẻ Thành viên Tình nguyện Viên** có mã QR Code cá nhân hóa, ảnh đại diện, chức vụ và dấu mộc Đoàn cơ sở.
  - Bấm nút **"In Thẻ Thành Viên Này"** để in thẻ đeo sự kiện hoặc in thẻ nhựa cho thành viên.
- **Chỉnh sửa / Xóa**:
  - Nút biểu tượng cây bút để sửa thông tin thành viên.
  - Nút thùng rác có thông báo xác nhận an toàn trước khi xóa.
- **Thao tác hàng loạt (Batch Actions)**:
  - Tích chọn nhiều thành viên ở ô checkbox đầu dòng để:
    + Xuất danh sách các mục đã chọn ra file Excel.
    + Xóa nhiều hồ sơ cùng một lúc.

### 3. 📝 Cổng Thu Thập Thông Tin / Đăng Ký Trực Tuyến (Public Form)
- Tab dành cho sinh viên, CTV mới điền thông tin tham gia CLB hoặc cập nhật thông tin:
  - **Thông tin cá nhân & Ảnh đại diện**: 
    + Họ tên, Giới tính, Ngày sinh, Địa chỉ/Quê quán.
    + **Ảnh đại diện**: Dán link ảnh chia sẻ từ **Google Drive / Web** (hệ thống tự chuyển đổi sang ảnh xem trực tiếp) hoặc bấm nút **"Chọn ảnh từ máy"** để tải ảnh chân dung trực tiếp từ điện thoại/máy tính lên. Có khung xem trước tức thì.
  - **Thông tin học tập tại Cơ sở Đức Hoà**: 
    + MSSV, Bậc đào tạo (Đại học/Cao đẳng/Trung cấp/Văn hoá/Sơ cấp), Lớp/Khóa.
    + **Chuyên ngành đào tạo**: Menu chọn nhanh 6 chuyên ngành chuẩn mực của trường:
      * **Cơ khí**
      * **Điện - Điện tử**
      * **May - TKTT**
      * **Kế toán - CNTT**
      * **KT Nông nghiệp**
      * **Khoa học cơ bản**
  - **Thông tin liên lạc**: SĐT/Zalo, Email, Link Facebook.
  - **Ban đăng ký hoạt động**: Ban Nhân sự, Ban Thư ký, Ban Truyền thông, Ban Thể thao, Ban Hậu cần, Ban Văn nghệ, Ban Quản lý VPĐ.
  - **Phân loại đăng ký**: Cộng tác viên (CTV mới).
  - **Tích chọn kỹ năng sở trường**: MC / Hoạt náo, Thiết kế Poster/Canva, Quay phim / Chụp ảnh, Dựng video ngắn, Hát / Nhạc cụ, Múa / Dân vũ / Nhảy.
- Sau khi bấm **"Gửi Đăng Ký"**:
  - Hệ thống tự cấp **Mã thành viên** (dạng `TD-YYYY-XXX`).
  - Hiệu ứng pháo hoa chúc mừng.
  - Thông tin tự động thêm vào cơ sở dữ liệu CLB ngay lập tức.

### 4. 🗂️ Quản Trị & Xuất/Nhập Dữ Liệu Excel
- **Xuất Excel (.xlsx)**:
  - Xuất ra file Excel định dạng chuẩn biểu mẫu của Đoàn Bộ phận, tiếng Việt có dấu 100%, có phân chia độ rộng cột chuẩn mực.
- **Nhập từ Excel (.xlsx, .xls)**:
  - Cho phép tải file Excel có sẵn danh sách sinh viên lên. Hệ thống tự động quét các cột tiếng Việt tương ứng và nạp vào phần mềm (yêu cầu quyền Admin).
- **Sao lưu (Backup) & Phục hồi (Restore)**:
  - Xuất file `.json` để sao lưu khi chuyển sang máy tính khác hoặc đề phòng mất dữ liệu trình duyệt.
- **Xóa trắng toàn bộ dữ liệu**:
  - Cho phép làm sạch 100% hồ sơ trong hệ thống để bắt đầu nhập dữ liệu mới của CLB (yêu cầu quyền Admin).

### 5. 🔐 Hệ Thống Phân Quyền & Quy Trình Xét Duyệt Admin
Hệ thống được thiết lập cơ chế phân quyền bảo mật 2 tầng chặt chẽ:
- **Tài khoản thường (Chế độ mặc định)**:
  - **Được phép**: Xem thống kê, tìm kiếm/lọc danh sách, xem chi tiết & in thẻ thành viên có mã QR, xuất báo cáo Excel, và **nhập thêm thông tin thành viên mới** (thông qua Cổng Đăng Ký Trực Tuyến hoặc nút Thêm Mới).
  - Khi nộp hồ sơ mới qua Cổng đăng ký hoặc form thêm mới, hồ sơ sẽ tự động ở trạng thái **"Chờ xét duyệt"**.
  - **Không được phép**: Chỉnh sửa thông tin hồ sơ của người khác, xóa bớt thành viên, **xét duyệt hồ sơ** (nút Duyệt bị khóa kèm ổ khóa), nhập Excel đè dữ liệu hoặc đặt lại dữ liệu mẫu. Khi nhấp vào các tính năng này, hệ thống sẽ hiển thị thông báo yêu cầu đăng nhập Admin.
- **Tài khoản Quản Trị Viên (Admin BCN)**:
  - **Thẩm quyền xét duyệt hồ sơ**:
    + Nút lọc nhanh **"Chờ Xét Duyệt"** màu cam trên thanh công cụ để lọc danh sách các hồ sơ mới nộp cần duyệt.
    + Nút **"Duyệt"** trên từng hồ sơ mở popup xét duyệt: cho phép chọn Ban phân công chính thức, chọn vai trò (Thành viên chính thức / CTV), ghi chú phê duyệt hoặc từ chối hồ sơ.
    + Tính năng **Xét duyệt hàng loạt**: Tích chọn nhiều hồ sơ và bấm nút *"Duyệt các mục đã chọn"* trên thanh thao tác hàng loạt.
  - Toàn quyền: Thêm, **Chỉnh sửa**, **Xóa thành viên**, Phê duyệt CTV/Hồ sơ mới, Nhập/Khôi phục CSDL.
  - **Thông tin đăng nhập mặc định**:
    - **Tên đăng nhập**: `TrongDong2@26`
    - **Mật khẩu**: `trongdong2026`
  - **Đổi mật khẩu**: Admin có thể tự đổi mật khẩu mới bất cứ lúc nào qua biểu tượng chiếc chìa khóa trên thanh tiêu đề.

---

## 🌐 HƯỚNG DẪN ĐƯA LÊN MẠNG INTERNET (NẾU MUỐN CHIA SẺ LINK CHO TÂN SINH VIÊN ĐIỀN)
Vì toàn bộ ứng dụng là HTML/CSS/JavaScript thuần túy, bạn có thể đưa lên web hoàn toàn miễn phí:
1. **GitHub Pages**: Đẩy thư mục này lên GitHub và bật GitHub Pages trong Settings -> Pages.
2. **Vercel / Netlify**: Kéo thả thư mục dự án lên trang chủ [Netlify Drop](https://app.netlify.com/drop) là có ngay 1 đường link web (ví dụ: `clb-trongdong-duchoa.netlify.app`) để gửi vào các nhóm Zalo lớp cho sinh viên đăng ký!
