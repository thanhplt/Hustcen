# HUST CINE - BACKEND ARCHITECTURE & INTEGRATION SPECIFICATION FOR ANTIGRAVITY

> **Dự án**: HUST Cine - Hệ thống Đặt vé Xem phim & Quản trị Vận hành Rạp Chiếu Phim
> **Phiên bản tài liệu**: v1.0.0 (Production Blueprint)
> **Mục tiêu**: Đóng gói toàn bộ thiết kế giao diện (25 Screens), Design System (`Technical Cinema`), Luồng nghiệp vụ (Customer + Admin + POS Box Office), CSDL (PostgreSQL / Prisma schema), RESTful API Endpoints và WebSocket Events để tích hợp thẳng vào Backend AntiGravity.

---

## 1. TỔNG QUAN HỆ THỐNG & PHÂN HỆ (SYSTEM OVERVIEW)

Toàn bộ hệ thống HUST Cine đã hoàn thiện thiết kế trên Canvas gồm **3 phân hệ lớn**:

| Phân hệ | Số lượng màn hình | Đối tượng người dùng | Kênh truy cập |
| :--- | :--- | :--- | :--- |
| **Customer Web/App** | 15 màn hình (S1 -> S14, S4a/b/c) | Khách hàng đặt vé, xem trailer, quản lý tài khoản | Web Desktop, Responsive Mobile |
| **Admin Portal** | 8 màn hình (A1 -> A8) | Quản lý rạp, Phim, Suất chiếu, Sơ đồ ghế, Bảng giá, F&B, Kế toán đối soát | Web Desktop Admin Dashboard |
| **Staff POS & Kiosk** | 2 màn hình (Light & Dark POS) | Thu ngân tại quầy bán vé & F&B tại sảnh rạp | Màn hình cảm ứng Touch POS, Kiosk sảnh |

---

## 2. BẢN ĐỒ MÀN HÌNH & LUỒNG CHUYỂN HƯỚNG (SCREEN MATRIX & NAVIGATION MAP)

### 2.1. Phân hệ Khách hàng (Customer Booking Journey)
1. **S1 - Home (`SCREEN_50`)**: Trang chủ, Hero banner phim hot, Thanh đặt vé nhanh (Quick Booking Bar), Tab Đang chiếu / Sắp chiếu, Trailer modal trigger.
   * *Điều hướng*: Chọn phim -> S3 (Chi tiết phim); Nhấn "Đặt vé nhanh" -> S3 hoặc S4a; Nhấn Play -> S13 (Trailer Modal).
2. **S2 - Movie Catalog (`SCREEN_38`)**: Danh sách phim & Bộ lọc nâng cao (Thể loại, Định dạng IMAX/2D, Độ tuổi, Cụm rạp).
   * *Điều hướng*: Bấm vào thẻ phim -> S3 (Chi tiết phim & Lịch chiếu).
3. **S3 - Movie Detail & 7-Day Showtimes (`SCREEN_36`)**: Chi tiết phim, Đạo diễn, Diễn viên, Dải chọn ngày 7 ngày (`Hôm nay`, `T2`...`CN`), Chips suất chiếu 5 trạng thái (`OPEN`, `CLOSING_SOON`, `CLOSED`, `ONGOING`, `ENDED`).
   * *Điều hướng*: Chọn chip suất chiếu còn mở -> S4a / S4b / S4c tương ứng với loại phòng chiếu.
4. **S4 - Sơ đồ chọn ghế (Seat Selection Matrix)**:
   * **S4a (`SCREEN_48`)**: Phòng Standard 2D (120 ghế).
   * **S4b (`SCREEN_34`)**: Phòng IMAX Laser (260 ghế) có khu vực VIP Sweetspot trung tâm.
   * **S4c (`SCREEN_22`)**: Phòng Luxury Recliner (40 ghế sofa chỉnh điện).
   * *Cơ chế*: Giữ ghế Real-time 10 phút, kiểm tra Orphan Seat (ghế đơn lẻ), đếm ngược đồng hồ.
   * *Điều hướng*: Bấm "Tiếp tục" -> S5 (Chọn Combo Bắp nước).
5. **S5 - F&B Concessions (`SCREEN_44`)**: Chọn combo bắp nước, upsell vị phô mai/caramel, quà tặng collectible.
   * *Điều hướng*: Bấm "Tiếp tục" -> S6 (Thanh toán Checkout) hoặc "Bỏ qua" -> S6.
6. **S6 - Checkout & Thanh toán (`SCREEN_42`)**: Điền thông tin khách, mã voucher SV Bách Khoa, tích điểm HUST Club, chọn cổng thanh toán (MoMo, VNPay-QR, Thẻ ATM/Visa, VietQR).
   * *Điều hướng*: Hoàn tất thanh toán Webhook -> S7 (Kết quả & Vé điện tử).
7. **S7 - Kết quả đơn hàng & E-Ticket (`SCREEN_46`)**: 3 trạng thái: Vé QR code hợp lệ + tải PDF; Thanh toán thất bại; Hết thời gian giữ ghế.
8. **S8 - Account & Vé của tôi (`SCREEN_40`)**: Quản lý thông tin hội viên, Hạng thẻ (Diamond/Silver), Lịch sử vé, Voucher ví.
9. **S9 - Cụm rạp & Bản đồ (`SCREEN_28`)**: Danh sách cụm rạp HUST Cine (Đại Cồ Việt, Times City, Cầu Giấy), Tiện ích rạp, Showtimes theo rạp.
10. **S10 - Đặt phòng Private Lab nguyên phòng (`SCREEN_30`)**: Đặt phòng chiếu riêng 10 người, chọn gói sinh nhật/cầu hôn, F&B cao cấp.
11. **S11 - Room Types Showcase (`SCREEN_26`)**: So sánh kỹ thuật 5 loại phòng (Standard, Wide, IMAX Laser, Recliner, Private Lab).
12. **S12 - Time-based Notices (`SCREEN_24`)**: Cảnh báo suất sắp đóng đặt vé (< 10 phút), Thông báo suất đã đóng, Đồng hồ giữ ghế rút ngắn.
13. **S13 & S14 - Modal Trailer & Quick Showtime Drawer (`SCREEN_32`)**: Xem trailer YouTube, Drawer chọn suất siêu tốc bên phải.

---

### 2.2. Phân hệ Quản trị & Điều hành Rạp (Admin Portal A1 -> A8)
1. **A1 - Admin Dashboard (`SCREEN_20`)**: Tổng quan KPI (Doanh thu thực, Vé bán, Tỷ lệ lấp đầy, Doanh thu F&B), Biểu đồ doanh thu ngày/tuần/tháng, Top phim ăn khách.
2. **A2 - Quản lý Suất chiếu & Lịch rạp (`SCREEN_18`)**: Tab theo phim & Tab Timeline theo phòng, cơ chế phát hiện trùng lịch (Conflict Check), cảnh báo hủy suất có vé đã bán.
3. **A3 - Trình dựng sơ đồ ghế Seat-Map Builder (`SCREEN_16`)**: Canvas kéo thả hàng ghế, lối đi, ghế đôi, ghế VIP, recliner, thiết lập giá theo vị trí.
4. **A4 - Quản lý Đơn hàng & Hoàn vé (`SCREEN_14`)**: Tra cứu mã đơn `#HUST-xxxx`, Chi tiết vé, Nút Hoàn tiền (Refund API) & Hủy ghế.
5. **A5 - Quản lý Phim & CRUD Form (`SCREEN_12`)**: Thêm/sửa phim, Upload poster (tỉ lệ 2:3), backdrop 16:9, nhúng trailer YouTube, kiểm tra nhúng hợp lệ.
6. **A6 - Quản lý Bảng giá vé & Ghế (`SCREEN_10`)**: Ma trận giá vé (Ngày thường, Cuối tuần, Suất chiếu sớm, Học sinh/Sinh viên Bách Khoa, Phụ thu 3D/IMAX).
7. **A7 - Quản lý Combo bắp nước & Kho F&B (`SCREEN_8`)**: Định mức BoM tồn kho (ngô, siro, phô mai), Quy tắc phụ thu upsell bắp nước, tự động ẩn món khi hết hàng tại POS.
8. **A8 - Báo cáo phân tích doanh thu & Đối soát tài chính (`SCREEN_6`)**: Đối soát cổng thanh toán (MoMo, VNPay, Vietcombank POS, Két tiền mặt), Bảng trích tỷ lệ bản quyền hãng phim (Studio Royalty Share), Khóa sổ kỳ kế toán.

---

### 2.3. Phân hệ Quầy POS Thu ngân (Staff Box Office)
1. **Staff POS Light Mode (`SCREEN_4`)** & **Dark Mode POS (`SCREEN_2`)**:
   - Giao diện cảm ứng 1 chạm cho nhân viên bán vé và F&B tại sảnh.
   - Thao tác nhanh: Chọn phim -> Chọn suất -> Chọn ghế -> Thêm combo -> Quẹt thẻ sinh viên giảm 20% -> Bàn tính tiền thừa siêu tốc.
   - Phím tắt ngoại vi: `[F1]` Phim, `[F2]` Ghế, `[F3]` F&B, `[F8]` Tiền mặt, `[F9]` QR Code, `[Enter]` In vé nhiệt Epson TM-T88VI.
   - Chế độ Dark Mode chống lóa mắt trong môi trường rạp tối.

---

## 3. DATABASE SCHEMA & DATA MODEL (CHO ANTIGRAVITY ORM / POSTGRESQL)

Dưới đây là cấu trúc Entity Relationship Diagram (ERD) bằng cú pháp Prisma Schema chuẩn mực:

```prisma
// datasource & generator
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 1. Phim (Movies)
model Movie {
  id              String         @id @default(uuid())
  titleVi         String         @map("title_vi")
  titleEn         String?        @map("title_en")
  slug            String         @unique
  synopsis        String         @db.Text
  durationMin     Int            @map("duration_min")
  releaseDate     DateTime       @map("release_date")
  endDate         DateTime?      @map("end_date")
  ageRating       AgeRating      @map("age_rating") // P, K, T13, T16, T18
  formats         MovieFormat[]  // 2D, 3D, IMAX, 2D_ATMOS
  posterUrl       String         @map("poster_url")
  backdropUrl     String?        @map("backdrop_url")
  trailerYoutube  String?        @map("trailer_youtube")
  director        String?
  cast            String[]
  language        String         @default("Tiếng Việt phụ đề")
  status          MovieStatus    @default(UPCOMING) // UPCOMING, NOW_SHOWING, STOPPED, DRAFT
  studioName      String?        @map("studio_name") // Warner Bros, CJ HK, CJ CGV
  studioSharePct  Decimal        @default(50.00) @map("studio_share_pct") @db.Decimal(5, 2)
  showtimes       Showtime[]
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("movies")
}

enum AgeRating {
  P
  K
  T13
  T16
  T18
}

enum MovieFormat {
  TWO_D
  THREE_D
  IMAX_LASER
  TWO_D_ATMOS
  LUXURY_SUITE
}

enum MovieStatus {
  DRAFT
  UPCOMING
  NOW_SHOWING
  STOPPED
}

// 2. Cụm Rạp & Phòng Chiếu (Cinemas & Auditoriums)
model Cinema {
  id          String        @id @default(uuid())
  name        String        // HUST Cine Đại Cồ Việt
  slug        String        @unique
  address     String
  city        String        @default("Hà Nội")
  phone       String?
  latitude    Float?
  longitude   Float?
  amenities   String[]      // Parking, Cafe, ATM, IMAX
  rooms       Auditorium[]
  orders      Order[]
  staffs      User[]
  createdAt   DateTime      @default(now()) @map("created_at")

  @@map("cinemas")
}

model Auditorium {
  id          String          @id @default(uuid())
  cinemaId    String          @map("cinema_id")
  name        String          // Phòng 01 (IMAX Laser)
  roomType    RoomType        @map("room_type") // STANDARD, IMAX, LUXURY, PRIVATE
  totalSeats  Int             @map("total_seats")
  seatLayout  Json            @map("seat_layout") // Cấu trúc ma trận ghế: rows, cols, types, coordinates
  isPrivate   Boolean         @default(false) @map("is_private")
  cinema      Cinema          @relation(fields: [cinemaId], references: [id])
  seats       Seat[]
  showtimes   Showtime[]

  @@map("auditoriums")
}

enum RoomType {
  STANDARD
  IMAX
  LUXURY
  PRIVATE_LAB
}

model Seat {
  id            String      @id @default(uuid())
  auditoriumId  String      @map("auditorium_id")
  rowCode       String      @map("row_code") // A, B, C, ... G
  seatNumber    Int         @map("seat_number") // 1, 2, ... 12
  seatLabel     String      @map("seat_label") // G10, G11
  seatType      SeatType    @default(STANDARD) @map("seat_type")
  priceMultiplier Decimal   @default(1.00) @map("price_multiplier") @db.Decimal(3, 2)
  auditorium    Auditorium  @relation(fields: [auditoriumId], references: [id])
  ticketSeats   TicketSeat[]

  @@unique([auditoriumId, rowCode, seatNumber])
  @@map("seats")
}

enum SeatType {
  STANDARD
  VIP_SWEETSPOT
  COUPLE
  RECLINER
  WHEELCHAIR
  SOFA_PRIVATE
}

// 3. Suất Chiếu (Showtimes)
model Showtime {
  id              String          @id @default(uuid())
  movieId         String          @map("movie_id")
  auditoriumId    String          @map("auditorium_id")
  startTime       DateTime        @map("start_time")
  endTime         DateTime        @map("end_time")
  format          MovieFormat     @default(TWO_D)
  basePrice       Decimal         @map("base_price") @db.Decimal(10, 2)
  status          ShowtimeStatus  @default(OPEN)
  bookingCutoffMin Int            @default(5) @map("booking_cutoff_min") // Đóng đặt vé trước 5 phút
  cleaningBufferMin Int           @default(15) @map("cleaning_buffer_min")
  movie           Movie           @relation(fields: [movieId], references: [id])
  auditorium      Auditorium      @relation(fields: [auditoriumId], references: [id])
  ticketSeats     TicketSeat[]
  orders          Order[]
  createdAt       DateTime        @default(now()) @map("created_at")

  @@map("showtimes")
}

enum ShowtimeStatus {
  OPEN
  CLOSING_SOON
  CLOSED
  ONGOING
  ENDED
  CANCELLED
}

// 4. Trạng thái Ghế theo Suất Chiếu (Real-time Seat State & Locks)
model TicketSeat {
  id          String          @id @default(uuid())
  showtimeId  String          @map("showtime_id")
  seatId      String          @map("seat_id")
  orderId     String?         @map("order_id")
  status      SeatStatus      @default(AVAILABLE)
  lockedAt    DateTime?       @map("locked_at")
  lockedBy    String?         @map("locked_by") // Session ID hoặc User ID giữ ghế
  lockExpires DateTime?       @map("lock_expires") // 10 phút hoặc trước start_time - 5 min
  finalPrice  Decimal         @map("final_price") @db.Decimal(10, 2)
  showtime    Showtime        @relation(fields: [showtimeId], references: [id])
  seat        Seat            @relation(fields: [seatId], references: [id])
  order       Order?          @relation(fields: [orderId], references: [id])

  @@unique([showtimeId, seatId])
  @@map("ticket_seats")
}

enum SeatStatus {
  AVAILABLE
  HELD
  BOOKED
  BLOCKED
}

// 5. Đơn Hàng & Vé Điện Tử (Orders & Payments)
model Order {
  id              String          @id @default(uuid())
  orderCode       String          @unique @map("order_code") // #HUST-10492
  userId          String?         @map("user_id")
  cinemaId        String          @map("cinema_id")
  showtimeId      String          @map("showtime_id")
  customerName    String          @map("customer_name")
  customerEmail   String          @map("customer_email")
  customerPhone   String          @map("customer_phone")
  channel         SalesChannel    @default(WEB) // WEB, MOBILE_APP, KIOSK, POS_BOX_OFFICE
  cashierId       String?         @map("cashier_id") // ID nhân viên quầy nếu đặt tại POS
  subtotal        Decimal         @db.Decimal(12, 2)
  discountAmount  Decimal         @default(0) @map("discount_amount") @db.Decimal(12, 2)
  studentDiscount Boolean         @default(false) @map("student_discount") // -20% cho SV Bách Khoa
  totalAmount     Decimal         @map("total_amount") @db.Decimal(12, 2)
  status          OrderStatus     @default(PENDING)
  paymentMethod   PaymentMethod   @map("payment_method") // MOMO, VNPAY, VIETQR, CASH, POS_CARD
  paymentRefCode  String?         @map("payment_ref_code")
  paidAt          DateTime?       @map("paid_at")
  qrTicketCode    String?         @unique @map("qr_ticket_code")
  refundStatus    RefundStatus?   @map("refund_status")
  refundAmount    Decimal?        @map("refund_amount") @db.Decimal(12, 2)
  refundReason    String?         @map("refund_reason")
  user            User?           @relation(fields: [userId], references: [id])
  cinema          Cinema          @relation(fields: [cinemaId], references: [id])
  showtime        Showtime        @relation(fields: [showtimeId], references: [id])
  ticketSeats     TicketSeat[]
  orderItems      OrderItem[]     // Danh sách F&B đính kèm
  createdAt       DateTime        @default(now()) @map("created_at")

  @@map("orders")
}

enum SalesChannel {
  WEB
  MOBILE_APP
  KIOSK
  POS_BOX_OFFICE
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  EXPIRED
  REFUNDED
}

enum PaymentMethod {
  MOMO
  VNPAY
  VIETQR
  CASH
  POS_CARD
  POINTS
}

enum RefundStatus {
  REQUESTED
  APPROVED
  REJECTED
  COMPLETED
}

// 6. F&B Bắp Nước & Tồn Kho (Concessions & Inventory)
model ConcessionItem {
  id              String          @id @default(uuid())
  sku             String          @unique // CB-DBL-02
  nameVi          String          @map("name_vi") // Combo HUST Double
  category        FnbCategory
  description     String?
  imageUrl        String?         @map("image_url")
  costPrice       Decimal         @map("cost_price") @db.Decimal(10, 2)
  sellingPrice    Decimal         @map("selling_price") @db.Decimal(10, 2)
  stockQuantity   Int             @default(0) @map("stock_quantity")
  minThreshold    Int             @default(10) @map("min_threshold") // Cảnh báo khi dưới ngưỡng
  autoHideOnEmpty Boolean         @default(true) @map("auto_hide_on_empty")
  isActive        Boolean         @default(true) @map("is_active")
  orderItems      OrderItem[]

  @@map("concession_items")
}

enum FnbCategory {
  COMBO
  POPCORN
  BEVERAGE
  HOT_SNACK
  MERCHANDISE
}

model OrderItem {
  id                String          @id @default(uuid())
  orderId           String          @map("order_id")
  concessionItemId  String          @map("concession_item_id")
  quantity          Int             @default(1)
  unitPrice         Decimal         @map("unit_price") @db.Decimal(10, 2)
  surcharges        Json?           // Đổi vị phô mai +15k, upsize +15k
  totalPrice        Decimal         @map("total_price") @db.Decimal(10, 2)
  order             Order           @relation(fields: [orderId], references: [id])
  concessionItem    ConcessionItem  @relation(fields: [concessionItemId], references: [id])

  @@map("order_items")
}

// 7. Người Dùng, Hội Viên & Phân Quyền (Users & Memberships)
model User {
  id              String      @id @default(uuid())
  email           String      @unique
  phone           String?     @unique
  fullName        String      @map("full_name")
  passwordHash    String      @map("password_hash")
  role            UserRole    @default(CUSTOMER) // CUSTOMER, STAFF_POS, CINEMA_ADMIN, SUPER_ADMIN
  studentId       String?     @map("student_id") // MSSV: 20210619 (để áp voucher -20%)
  hustClubTier    ClubTier    @default(MEMBER) @map("hust_club_tier")
  loyaltyPoints   Int         @default(0) @map("loyalty_points")
  assignedCinemaId String?    @map("assigned_cinema_id")
  orders          Order[]
  assignedCinema  Cinema?     @relation(fields: [assignedCinemaId], references: [id])
  createdAt       DateTime    @default(now()) @map("created_at")

  @@map("users")
}

enum UserRole {
  CUSTOMER
  STAFF_POS
  CINEMA_ADMIN
  SUPER_ADMIN
}

enum ClubTier {
  MEMBER
  SILVER
  GOLD
  DIAMOND
}
```

---

## 4. DANH MỤC RESTful API ENDPOINTS (DÀNH CHO BACKEND ANTIGRAVITY)

### 4.1. Phim & Lịch chiếu (Movies & Showtimes)
* `GET /api/v1/movies`: Lấy danh sách phim đang chiếu & sắp chiếu (hỗ trợ filter thể loại, tuổi, định dạng).
* `GET /api/v1/movies/:slug`: Lấy thông tin chi tiết phim, đạo diễn, diễn viên, link trailer YouTube.
* `GET /api/v1/movies/:id/showtimes?date=YYYY-MM-DD&cinemaId=xxx`: Lấy ma trận suất chiếu 7 ngày của phim, phân loại phòng (Standard, IMAX, Luxury), tính toán 5 trạng thái (`OPEN`, `CLOSING_SOON`, `CLOSED`, `ONGOING`, `ENDED`).
* `GET /api/v1/showtimes/:id/seats`: Lấy sơ đồ ghế phòng chiếu, tọa độ ghế và trạng thái thời gian thực (`AVAILABLE`, `HELD`, `BOOKED`).

### 4.2. Khóa ghế & Giữ chỗ Real-time (Seat Lock Mechanism)
* `POST /api/v1/showtimes/:id/seats/lock`: Khóa giữ ghế trong 10 phút.
  * *Request Body*: `{ seatIds: ["G10", "G11"], sessionId: "sess_xxx" }`
  * *Logic*: Kiểm tra ghế trống -> Khóa -> Thiết lập TTL 10 phút trong Redis -> Broadcast WebSocket tới các client khác.
* `POST /api/v1/showtimes/:id/seats/unlock`: Giải phóng ghế đã khóa nếu người dùng hủy hoặc đổi ghế.

### 4.3. Bắp nước F&B & Upsell
* `GET /api/v1/concessions`: Lấy danh sách Combo, bắp nước kèm các option phụ thu (Upsize, Đổi vị phô mai/caramel). Tự động lọc các món hết hàng nếu cấu hình `autoHideOnEmpty = true`.

### 4.4. Đơn hàng & Thanh toán (Orders & Payment Webhooks)
* `POST /api/v1/orders/checkout`: Tạo đơn hàng thanh toán từ ghế đã giữ và F&B.
  * *Request Body*: `{ showtimeId, seatIds, concessionItems, customerInfo, voucherCode, studentId, paymentMethod }`
  * *Response*: Trả về URL thanh toán MoMo / VNPay-QR hoặc mã VietQR chuyển khoản tức thì.
* `POST /api/v1/payments/webhook/:gateway`: Webhook nhận kết quả thanh toán từ MoMo, VNPay, VietQR -> Xác thực chữ ký số -> Cập nhật đơn hàng thành `PAID` -> Kích hoạt sinh mã vé QR Code -> Gửi vé qua Email / SMS.
* `GET /api/v1/orders/:orderCode`: Lấy chi tiết vé điện tử, mã QR code và trạng thái hóa đơn.

### 4.5. Phân hệ POS Quầy Vé (Staff Box Office APIs)
* `POST /api/v1/pos/orders/create-and-print`: Tạo đơn vé trực tiếp tại quầy bằng phím tắt `[Enter]`. Hỗ trợ thanh toán tiền mặt (ghi nhận tiền khách đưa & tiền thừa trả lại), in trực tiếp qua máy in bill mạng LAN (Epson ESC/POS protocol).
* `POST /api/v1/pos/cashier/session-shift`: Bắt đầu / Kết thúc ca trực, đối soát tiền két an toàn F2.

### 4.6. Phân hệ Quản trị Admin (Admin Back-office APIs)
* `GET /api/v1/admin/analytics/dashboard`: Lấy thống kê KPI doanh thu, vé bán, occupancy rate cho màn hình A1.
* `POST /api/v1/admin/showtimes/conflict-check`: Kiểm tra va chạm lịch chiếu (trùng phòng, vi phạm thời gian dọn phòng 15 phút) trước khi lưu ca chiếu mới.
* `POST /api/v1/admin/orders/:id/refund`: Khởi tạo hoàn tiền tự động qua cổng thanh toán ban đầu và hủy vé.
* `GET /api/v1/admin/reconciliation/monthly`: Xuất báo cáo đối soát cổng thanh toán & phân bổ tiền vé hãng phim (A8).

---

## 5. REAL-TIME WEBSOCKET EVENTS (SOCKET.IO / REDIS PUBSUB)

Để đảm bảo không bao giờ xảy ra tình trạng 2 khách đặt trùng ghế cùng lúc (Double-Booking), Backend AntiGravity cần cài đặt WebSocket Server:

| Event Name | Direction | Payload | Mô tả |
| :--- | :--- | :--- | :--- |
| `seat:lock` | Client -> Server | `{ showtimeId, seatIds, userId }` | Khách chọn ghế và gửi yêu cầu khóa |
| `seat:locked` | Server -> Broadcast | `{ showtimeId, seatIds, expiresAt }` | Thông báo cho tất cả client đang xem sơ đồ ghế chuyển sang màu vàng (HELD) |
| `seat:released` | Server -> Broadcast | `{ showtimeId, seatIds }` | Thông báo ghế được giải phóng khi hết 10 phút hoặc khách hủy |
| `seat:booked` | Server -> Broadcast | `{ showtimeId, seatIds }` | Chuyển ghế sang trạng thái màu xám sọc chéo (BOOKED) sau khi thanh toán thành công |
| `fnb:stock_depleted` | Server -> Broadcast | `{ sku }` | Thông báo món F&B vừa hết hàng để ẩn tức thì trên màn hình Kiosk và Web/App |

---

## 6. HƯỚNG DẪN TÍCH HỢP VỚI ANTIGRAVITY (STEP-BY-STEP DEPLOYMENT)

1. **Khởi tạo Database Schema**: Copy toàn bộ mã Prisma trong Mục 3 vào file `prisma/schema.prisma` trong dự án AntiGravity, sau đó chạy lệnh:
   ```bash
   npx prisma migrate dev --name init_hust_cine_schema
   ```
2. **Cấu hình Redis Cache & Seat Hold TTL**: Sử dụng Redis Key dạng `showtime:{showtimeId}:seat:{seatId}` với TTL là `600` (giây) để xử lý atomic lock cho ghế.
3. **Cài đặt Payment Gateways**: Tích hợp các SDK MoMo Partner, VNPay Merchant và VietQR theo các endpoint khai báo ở Mục 4.
4. **Kết nối Frontend Screens**:
   - Sử dụng các mã màu trong file `design.md` (`#C8102E` Red, `#1A1A1F` Ink, `#FBF8FF` Surface) đã đồng bộ trên 25 screens.
   - Nút chuyển Dark/Light Mode đã được tích hợp sẵn lớp CSS `.dark` trên toàn bộ component.
