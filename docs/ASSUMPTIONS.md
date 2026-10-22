# HUST Cine - Kỷ yếu Giả định & Quyết định Kỹ thuật (ASSUMPTIONS.md)

Tài liệu này ghi nhận toàn bộ các giả định, quyết định kiến trúc và điều chỉnh theo chỉ thị của người dùng.

---

### 1. Cơ chế Lưu trữ CSDL không dùng Docker (Zero-Docker Database)
- **Yêu cầu người dùng**: "Không dùng docker. Còn lại ok".
- **Quyết định**: Sử dụng **Prisma ORM với SQLite** (`file:./dev.db`).
- **Lý do**:
  - Không yêu cầu cài đặt PostgreSQL engine riêng trên Windows (máy người dùng không có PostgreSQL chạy ngầm).
  - Khởi tạo ngay lập tức, `npm run db:reset` chỉ mất vài giây để tái tạo toàn bộ dữ liệu.
  - Hỗ trợ đầy đủ quan hệ Relational (1-n, n-n, cascade delete), ACID transactions, và conditional update atomic cho bài toán giữ ghế.
  - Các trường kiểu Enum được ánh xạ thành `String` trong Prisma Schema và quản lý bằng TypeScript enum chặt chẽ trong mã nguồn.

### 2. Sử dụng Ảnh Poster Thật & Tải ảnh lên
- **Yêu cầu người dùng**: "được quyền sử dụng poster ảnh thật, thêm chức năng cho phép tải ảnh poster lên".
- **Quyết định**:
  - Dữ liệu seed khởi tạo sẵn 12 bộ phim chiếu rạp hot với poster chất lượng cao sắc nét (Đào Phở và Piano, Mai, Lật Mặt 7, Oppenheimer, Dune 2, Avatar, Spider-Man,...).
  - Tích hợp endpoint upload ảnh `POST /api/v1/admin/uploads/poster` (multipart/form-data), dùng thư viện `sharp` chuẩn hóa thành định dạng WebP, tạo 3 biến thể kích thước (600x900, 300x450, 120x180) và mã hóa blurhash.
  - Giao diện Admin quản trị phim có vùng kéo thả / chọn file tải ảnh lên xem trước (Live Preview).

### 3. Tự động chạy Trailer YouTube (Autoplay)
- **Yêu cầu người dùng**: "gắn link youtube vào trailer để nó tự chạy".
- **Quyết định**:
  - Khi mở Modal Trailer (click nút Play trên poster hoặc nút "Xem trailer"), Iframe YouTube tự động kích hoạt `autoplay=1&enablejsapi=1`.
  - Có cơ chế xử lý chính sách Autoplay của trình duyệt (trình duyệt chặn âm thanh tự phát thì tự động fallback về `mute=1` và hiển thị nút bật tiếng 1-chạm).
  - Khi đóng Modal, tự động phát lệnh `pauseVideo()` / xóa player để không phát tiếng ngầm.

### 4. Cấu hình Cổng & Môi trường Cục bộ
- **Backend (NestJS)**: `http://localhost:4000` (API prefix: `/api/v1`, Swagger docs: `/docs`).
- **Frontend (Next.js)**: `http://localhost:3000`.
- **Thư mục Upload cục bộ**: `apps/backend/uploads/` được phục vụ tĩnh qua đường dẫn `http://localhost:4000/uploads/`.
- **Đồng hồ Hệ thống (ClockService)**: Duy trì một singleton hỗ trợ Dev Time Travel (`/dev/clock`) phục vụ kiểm thử trạng thái suất chiếu và hạn chót đặt vé 5 phút.
