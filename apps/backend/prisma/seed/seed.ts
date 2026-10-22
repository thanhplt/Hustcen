import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HUST Cine Database Seed (Relative to Current Clock)...');

  // Clear existing data (in dependency order)
  await prisma.auditLog.deleteMany();
  await prisma.devMail.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.staffShift.deleteMany();
  await prisma.voucherRedemption.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.bookingCombo.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.showtimeSeries.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.notifyMeSubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.news.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.auditorium.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.user.deleteMany();
  await prisma.membershipTier.deleteMany();

  console.log('🧹 Cleared old records.');

  // 1. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'bookingCutoffMinutes', value: '5', description: 'Số phút chặn đặt vé trước giờ chiếu' },
      { key: 'closingSoonMinutes', value: '15', description: 'Khoảng thời gian cảnh báo sắp đóng đặt vé (đếm ngược)' },
      { key: 'cleaningBufferMinutes', value: '15', description: 'Thời gian dọn phòng giữa 2 ca chiếu liên tiếp' },
      { key: 'seatHoldMinutes', value: '10', description: 'Thời gian tối đa giữ ghế (giữ chỗ tạm thời)' },
    ],
  });

  // 2. Membership Tiers
  const silverTier = await prisma.membershipTier.create({
    data: { name: 'HUST Club Silver', minPoints: 0, discountPercent: 0.0 },
  });
  const goldTier = await prisma.membershipTier.create({
    data: { name: 'HUST Club Gold', minPoints: 500, discountPercent: 5.0 },
  });
  const diamondTier = await prisma.membershipTier.create({
    data: { name: 'HUST Club Diamond', minPoints: 1000, discountPercent: 10.0 },
  });

  // 3. Demo Users
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const managerHash = await bcrypt.hash('Manager@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@hustcine.edu.vn',
        phone: '0981112233',
        fullName: 'Quản trị viên Hệ thống (Admin)',
        passwordHash,
        role: 'ADMIN',
      },
      {
        email: 'manager@hustcine.edu.vn',
        phone: '0982223344',
        fullName: 'Quản lý Cụm Rạp Bách Khoa (Manager)',
        passwordHash: managerHash,
        role: 'MANAGER',
      },
      {
        email: 'staff@hustcine.edu.vn',
        phone: '0983334455',
        fullName: 'Thu ngân Box Office (Staff)',
        passwordHash: staffHash,
        role: 'STAFF',
      },
      {
        email: 'customer@hust.edu.vn',
        phone: '0984445566',
        fullName: 'Nguyễn Văn Bách Khoa',
        passwordHash: customerHash,
        role: 'CUSTOMER',
        tierId: diamondTier.id,
        loyaltyPoints: 850,
      },
    ],
  });

  // 4. Genres
  const genresData = [
    { name: 'Hành Động', slug: 'hanh-dong' },
    { name: 'Khoa Học Viễn Tưởng', slug: 'khoa-hoc-vien-tuong' },
    { name: 'Tình Cảm', slug: 'tinh-cam' },
    { name: 'Hài Kịch', slug: 'hai-kich' },
    { name: 'Kinh Dị', slug: 'kinh-di' },
    { name: 'Tâm Lý', slug: 'tam-ly' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  ];
  const genresMap: Record<string, string> = {};
  for (const g of genresData) {
    const created = await prisma.genre.create({ data: g });
    genresMap[g.slug] = created.id;
  }

  // 5. Read trailers.json
  const trailersPath = path.join(__dirname, 'trailers.json');
  let trailersList: any[] = [];
  if (fs.existsSync(trailersPath)) {
    trailersList = JSON.parse(fs.readFileSync(trailersPath, 'utf8'));
  }

  // 6. Movies (12 Movies)
  const moviesRaw = [
    {
      slug: 'chien-binh-cong-nghe-ky-nguyen-moi',
      title: 'Chiến Binh Công Nghệ: Kỷ Nguyên Mới',
      originalTitle: 'Cyber Odyssey 2026',
      synopsis: 'Khi mạng lưới năng lượng nguyên tử lượng tử tại Viện Nghiên Cứu Bách Khoa bị kích hoạt ngoài tầm kiểm soát, nhóm kỹ sư tương lai phải chạy đua với thời gian để định hình lại trật tự nhân loại trước thềm cuộc đại thanh trừng mạng.',
      durationMinutes: 128,
      ageRating: 'T16',
      country: 'Việt Nam',
      director: 'Trần Anh Khoa',
      castList: JSON.stringify(['Nguyễn Hùng', 'Lê Thảo', 'Hoàng Minh']),
      formats: JSON.stringify(['2D', '3D', 'IMAX']),
      status: 'NOW_SHOWING',
      ratingAvg: 9.2,
      ratingCount: 342,
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFpKKQtTteDgstEPTdIjVH_DljAUcIBkVsqlFL6jDiEVo9qVwT0KkfBzXp_wKUQPT78tKTXZY1i9PlCZs7Y0Rh6dFKCmA45Pjrr1j-ga_Lq0NLpKiMEJPxfHHUF7t4VUwV9JCbX5M30iZHd5MqkM8X2S_OjklWgx5XQd2uuBtWev0qd3d2pUR71TXT-T0b8yNotUwypzOgEMUj3ujIt8smhNqfrPSlZWOYKnzXnJsJkutYRMRd1A5l',
      backdropUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtIl3K5mW66d9aP5SNZdL2ggN-cK79IyQdbp2cDxWQOw_WcVAjir4aMn_Fn1FMxEPmWXMVidwG8BKihNYnsLGQwi8zO8LHI-olDOpnQ5bO971NHVNHsOaDKc3wgfwd_g30yGQqUMU-XbHBdbst4W36aZ5Zak24h5HQpj6Np1-_tYXCn0-byDHUVe9cHDeQtHEkAcec4xER2Js5me4bDyuLWwnh57Dh2quupM4ukXI1gvUBVuTzXCQm',
      genres: ['hanh-dong', 'khoa-hoc-vien-tuong'],
    },
    {
      slug: 'ky-uc-bach-khoa',
      title: 'Ký Ức Bách Khoa',
      originalTitle: 'Hanoi Autumn Memories',
      synopsis: 'Câu chuyện thanh xuân vườn trường dưới những tán cây rợp bóng của giảng đường Đại học Bách Khoa Hà Nội, nơi tình bạn và những ước mơ kỹ sư đầu tiên chớm nở.',
      durationMinutes: 110,
      ageRating: 'P',
      country: 'Việt Nam',
      director: 'Đặng Nhật Minh',
      castList: JSON.stringify(['Bảo Anh', 'Thanh Sơn', 'Khánh Linh']),
      formats: JSON.stringify(['2D']),
      status: 'NOW_SHOWING',
      ratingAvg: 8.8,
      ratingCount: 215,
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3lyN08RuarEgOqP_wldTojWI3F9a2lDW_3jKwch2A4QteMIdfNb4E3UdQkUhRDBuJouMGyWVWoCDzGybkLiVjQztn6bnH9lhdmo-thxgW0i-7N9Hwuhd-_Nb73Q2TTa8uUNIYz81pGDonuG77wwJFbCDFqzEJ1SaKQP1OEX6vJRx6ytdsx0dNOsXZ53APsqn8aoZIU7aBJlMniPtxwU80u-vQqXgQwNI3Zzung5ZHwlDA3WumZoxd',
      backdropUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWnsUsL4eeiAMaWDi87FXEOqiR7iar3Rd6WqzYooAgZHVhWHt-vNkHJsuOvrtwOOzpl2crlet2AqagZeWi9XPzc0ibLbB_MShURvyyIE7L1o9-8R02FbRc_PVOKw1-QXDql5iwBgt2rdlQFYFEjlSGBTMJO3a1ed6myctk7vHSAQRZGghmTItxjkrLfJxbA6H-sVPEl0nQWelcHNMQEJKiA1tF7GdyQEIGsyhokWtqJMrVurkpHUMY',
      genres: ['tinh-cam', 'tam-ly'],
    },
    {
      slug: 'hanh-tinh-song-song',
      title: 'Hành Tinh Song Song',
      originalTitle: 'Parallel Planet Odyssey',
      synopsis: 'Chuyến thám hiểm ngoài không gian sâu khám phá ra bản thể phản chiếu của Trái Đất cùng những hiểm họa chưa từng được tiên liệu.',
      durationMinutes: 142,
      ageRating: 'T18',
      country: 'Mỹ',
      director: 'Christopher Nolan',
      castList: JSON.stringify(['Matthew McConaughey', 'Jessica Chastain']),
      formats: JSON.stringify(['2D', 'IMAX']),
      status: 'NOW_SHOWING',
      ratingAvg: 9.5,
      ratingCount: 890,
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAT5hP35zzvd7Evq2NtEsKGuvVZ67blRlSUy8gt05QfMzYg2oHiZsMTTmYkCbPm4SoKZD3rx910OnlaDpCJKCumLMZeG4Oh04NBmlTwSQmMlQ9ZS5cmyuyfANks1W1W694QgOwHPzpbqwn-2KAy9G1Iw7til1iKVg72z2M-YujXxexnkSgoLcG1NAKBm5u7DBo7kIhnvzPBeBjOICxzeYKFCDKBesy-hnPBQPFvWyl0rTYBv4JelUMK',
      backdropUrl: null,
      genres: ['khoa-hoc-vien-tuong', 'kinh-di'],
    },
    {
      slug: 'spider-man-across-the-spider-verse',
      title: 'Người Nhện: Du Hành Vũ Trụ Nhện',
      originalTitle: 'Spider-Man: Across the Spider-Verse',
      synopsis: 'Miles Morales du hành xuyên đa vũ trụ và đối mặt với một liên minh Người Nhện khổng lồ chịu trách nhiệm bảo vệ sự tồn vong của thế giới.',
      durationMinutes: 140,
      ageRating: 'P',
      country: 'Mỹ',
      director: 'Joaquim Dos Santos',
      castList: JSON.stringify(['Shameik Moore', 'Hailee Steinfeld']),
      formats: JSON.stringify(['2D', '3D', 'IMAX']),
      status: 'NOW_SHOWING',
      ratingAvg: 9.4,
      ratingCount: 1120,
      posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
      genres: ['hoat-hinh', 'hanh-dong', 'phieu-luu'],
    },
    {
      slug: 'lat-mat-7-mot-dieu-uoc',
      title: 'Lật Mặt 7: Một Điều Ước',
      originalTitle: 'Face Off 7: One Wish',
      synopsis: 'Câu chuyện cảm động về tình mẫu tử của bà Hai 73 tuổi và năm người con bận rộn giữa những bộn bề lo toan của cuộc sống hiện đại.',
      durationMinutes: 138,
      ageRating: 'K',
      country: 'Việt Nam',
      director: 'Lý Hải',
      castList: JSON.stringify(['Thanh Hiền', 'Trương Minh Cường', 'Đinh Y Nhung']),
      formats: JSON.stringify(['2D']),
      status: 'NOW_SHOWING',
      ratingAvg: 9.0,
      ratingCount: 450,
      posterUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
      genres: ['tam-ly', 'tinh-cam'],
    },
    {
      slug: 'avatar-dong-chay-cua-nuoc',
      title: 'Avatar: Dòng Chảy Của Nước',
      originalTitle: 'Avatar: The Way of Water',
      synopsis: 'Jake Sully cùng Neytiri khám phá những vùng biển bao la kỳ vĩ của hành tinh Pandora và chiến đấu bảo vệ gia đình trước kẻ thù truyền kiếp.',
      durationMinutes: 192,
      ageRating: 'T13',
      country: 'Mỹ',
      director: 'James Cameron',
      castList: JSON.stringify(['Sam Worthington', 'Zoe Saldana']),
      formats: JSON.stringify(['2D', '3D', 'IMAX']),
      status: 'NOW_SHOWING',
      ratingAvg: 9.1,
      ratingCount: 2300,
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      genres: ['hanh-dong', 'khoa-hoc-vien-tuong', 'phieu-luu'],
    },
    {
      slug: 'dao-pho-va-piano',
      title: 'Đào, Phở và Piano',
      originalTitle: 'Peach Blossom, Pho and Piano',
      synopsis: 'Bản hùng ca lãng mạn tái hiện cuộc chiến đấu bảo vệ thủ đô Hà Nội trong 60 ngày đêm khói lửa mùa đông năm 1946.',
      durationMinutes: 100,
      ageRating: 'T13',
      country: 'Việt Nam',
      director: 'Phi Tiến Sơn',
      castList: JSON.stringify(['Doãn Quốc Đam', 'Cao Thùy Linh', 'NSND Trung Hiếu']),
      formats: JSON.stringify(['2D']),
      status: 'NOW_SHOWING',
      ratingAvg: 8.9,
      ratingCount: 560,
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eada?w=1200&auto=format&fit=crop&q=80',
      genres: ['tam-ly', 'hanh-dong'],
    },
    {
      slug: 'mat-ma-khong-gian',
      title: 'Mật Mã Không Gian',
      originalTitle: 'Deep Space Cipher',
      synopsis: 'Vụ án gián điệp công nghệ cao với các luồng mã độc được ẩn giấu bên trong tín hiệu vệ tinh quỹ đạo tầm thấp.',
      durationMinutes: 105,
      ageRating: 'T13',
      country: 'Việt Nam',
      director: 'Vũ Ngọc Đãng',
      castList: JSON.stringify(['Quang Tuấn', 'Diễm My']),
      formats: JSON.stringify(['2D']),
      status: 'COMING_SOON',
      ratingAvg: 0.0,
      ratingCount: 0,
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfm27TsJkIB7vmggVWxWM7t7_LAatRagiNt1egEA3SRaaJY6keimIie-WuyERvonZPeKd0J4szWkAhDD61_7oPsfH-8UbAbmHIQlwfGGukUMJLvI6w_8zEL27JGccM8kcVSph_E_OKI8rFirQUClDdRerl-FO4fE_UIQCMWGwRMzZkKY07RTxqC34heMN0bFIkKgiODXYpyYm03tTFCDG0HkDHB2wWILLhdPp1TEF0YYBQ6AJL-vXb',
      backdropUrl: null,
      genres: ['khoa-hoc-vien-tuong', 'kinh-di'],
    },
    {
      slug: 'tham-tu-lung-danh-hanoi',
      title: 'Thám Tử Lừng Danh Hà Nội',
      originalTitle: 'Hanoi Detective',
      synopsis: 'Cuộc đấu trí nghẹt thở giữa một thanh tra lão luyện và tên tội phạm bí ẩn qua 36 phố phường Hà Nội cổ kính.',
      durationMinutes: 115,
      ageRating: 'T16',
      country: 'Việt Nam',
      director: 'Victor Vũ',
      castList: JSON.stringify(['Huy Khánh', 'Maya']),
      formats: JSON.stringify(['2D']),
      status: 'COMING_SOON',
      ratingAvg: 0.0,
      ratingCount: 0,
      posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80',
      genres: ['hanh-dong', 'kinh-di'],
    },
    {
      slug: 'cuoc-chien-luong-tu',
      title: 'Cuộc Chiến Lượng Tử',
      originalTitle: 'Quantum Realm Battle',
      synopsis: 'Khai mở cánh cổng lượng tử thu nhỏ con người xuống kích thước hạ nguyên tử để giải cứu nguồn tài nguyên tương lai.',
      durationMinutes: 120,
      ageRating: 'T13',
      country: 'Mỹ',
      director: 'Peyton Reed',
      castList: JSON.stringify(['Paul Rudd', 'Evangeline Lilly']),
      formats: JSON.stringify(['2D', '3D']),
      status: 'COMING_SOON',
      ratingAvg: 0.0,
      ratingCount: 0,
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      genres: ['khoa-hoc-vien-tuong', 'hanh-dong'],
    },
    {
      slug: 'nguoi-may-tro-ve',
      title: 'Người Máy Trở Về',
      originalTitle: 'The Android Return',
      synopsis: 'Một người máy AI có cảm xúc trốn thoát khỏi phòng thí nghiệm công nghệ cao để tìm kiếm người chế tạo ra mình.',
      durationMinutes: 118,
      ageRating: 'P',
      country: 'Việt Nam',
      director: 'Nguyễn Quang Dũng',
      castList: JSON.stringify(['Kiều Minh Tuấn', 'Kaity Nguyễn']),
      formats: JSON.stringify(['2D']),
      status: 'COMING_SOON',
      ratingAvg: 0.0,
      ratingCount: 0,
      posterUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      genres: ['khoa-hoc-vien-tuong', 'hai-kich'],
    },
    {
      slug: 'giac-mo-dien-anh',
      title: 'Giấc Mơ Điện Ảnh',
      originalTitle: 'Cinema Dreams',
      synopsis: 'Hành trình khởi nghiệp đầy chông gai nhưng ngập tràn tiếng cười của nhóm sinh viên Bách Khoa đam mê làm phim độc lập.',
      durationMinutes: 98,
      ageRating: 'P',
      country: 'Việt Nam',
      director: 'Trấn Thành',
      castList: JSON.stringify(['Tuấn Trần', 'Uyển Ân']),
      formats: JSON.stringify(['2D']),
      status: 'COMING_SOON',
      ratingAvg: 0.0,
      ratingCount: 0,
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
      genres: ['hai-kich', 'tam-ly'],
    },
  ];

  const createdMovies: Record<string, string> = {};
  for (const m of moviesRaw) {
    const trailerInfo = trailersList.find((t) => t.slug === m.slug) || {};
    const movie = await prisma.movie.create({
      data: {
        slug: m.slug,
        title: m.title,
        originalTitle: m.originalTitle,
        synopsis: m.synopsis,
        durationMinutes: m.durationMinutes,
        releaseDate: new Date(),
        ageRating: m.ageRating,
        country: m.country,
        director: m.director,
        castList: m.castList,
        formats: m.formats,
        status: m.status,
        ratingAvg: m.ratingAvg,
        ratingCount: m.ratingCount,
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        trailerYoutubeId: trailerInfo.youtubeId || null,
        trailerUrlOriginal: trailerInfo.youtubeUrl || null,
        trailerEmbeddable: trailerInfo.embeddable ?? null,
        trailerTitle: trailerInfo.title || null,
      },
    });
    createdMovies[m.slug] = movie.id;

    for (const gSlug of m.genres) {
      if (genresMap[gSlug]) {
        await prisma.movieGenre.create({
          data: {
            movieId: movie.id,
            genreId: genresMap[gSlug],
          },
        });
      }
    }
  }

  // 7. Cinemas (5 cụm rạp tại Hà Nội)
  const cinemasData = [
    {
      name: 'HUST Cine Đại Cồ Việt',
      slug: 'hust-cine-dai-co-viet',
      address: 'Số 1 Đại Cồ Việt, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
      phone: '1900 2026',
      city: 'Hà Nội',
      amenities: JSON.stringify(['IMAX Laser', 'Dolby Atmos', 'Cafe Kỹ Thuật', 'Hầm Để Xe Thông Minh', 'Private Suite']),
    },
    {
      name: 'HUST Cine Times City',
      slug: 'hust-cine-times-city',
      address: 'TTTM Vincom Mega Mall Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội',
      phone: '1900 2027',
      city: 'Hà Nội',
      amenities: JSON.stringify(['IMAX Laser', 'Ghế Đôi Sweetbox', 'Khu Vui Chơi']),
    },
    {
      name: 'HUST Cine Cầu Giấy',
      slug: 'hust-cine-cau-giay',
      address: '122 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
      phone: '1900 2028',
      city: 'Hà Nội',
      amenities: JSON.stringify(['Dolby Atmos', 'Khu Vực Sinh Viên', 'Trà Sữa']),
    },
    {
      name: 'HUST Cine Long Biên',
      slug: 'hust-cine-long-bien',
      address: 'TTTM Savico Megamall, Số 7-9 Nguyễn Văn Linh, Long Biên, Hà Nội',
      phone: '1900 2029',
      city: 'Hà Nội',
      amenities: JSON.stringify(['Bãi Đỗ Xe Rộng', 'Rạp Siêu Rộng']),
    },
    {
      name: 'HUST Cine Hà Đông',
      slug: 'hust-cine-ha-dong',
      address: 'Khu Đô Thị Mỗ Lao, Phường Mộ Lao, Quận Hà Đông, Hà Nội',
      phone: '1900 2030',
      city: 'Hà Nội',
      amenities: JSON.stringify(['Phòng Chiếu Gia Đình', 'Giá Ưu Đãi']),
    },
  ];

  const createdCinemas: any[] = [];
  for (const c of cinemasData) {
    const cinema = await prisma.cinema.create({ data: c });
    createdCinemas.push(cinema);
  }

  // 8. Auditoriums & Seat Generator Helpers
  async function generateSeatsForAuditorium(
    auditoriumId: string,
    type: 'STANDARD' | 'GRAND' | 'IMAX' | 'LUXURY' | 'PRIVATE',
  ) {
    const seatsToInsert: any[] = [];

    if (type === 'STANDARD') {
      // 120 seats: rows A-J x 12. A-E standard (60), F-I VIP (48), row J = 6 couple seats (counts as 12).
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      for (const row of rows) {
        if (row === 'J') {
          for (let s = 1; s <= 6; s++) {
            seatsToInsert.push({
              auditoriumId,
              rowCode: 'J',
              seatNumber: s,
              seatLabel: `J${s * 2 - 1}-J${s * 2}`,
              seatType: 'COUPLE',
            });
          }
        } else {
          const seatType = ['A', 'B', 'C', 'D', 'E'].includes(row) ? 'STANDARD' : 'VIP';
          for (let s = 1; s <= 12; s++) {
            seatsToInsert.push({
              auditoriumId,
              rowCode: row,
              seatNumber: s,
              seatLabel: `${row}${s}`,
              seatType,
            });
          }
        }
      }
      // Wheelchair spots
      seatsToInsert.push(
        { auditoriumId, rowCode: 'A', seatNumber: 13, seatLabel: 'W1', seatType: 'WHEELCHAIR', isWheelchair: true },
        { auditoriumId, rowCode: 'A', seatNumber: 14, seatLabel: 'W2', seatType: 'WHEELCHAIR', isWheelchair: true },
      );
    } else if (type === 'GRAND') {
      // 200 seats: rows A-L x 16 (A-F standard 96, G-L VIP 96), row M = 4 couple (8).
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      for (const row of rows) {
        const seatType = ['A', 'B', 'C', 'D', 'E', 'F'].includes(row) ? 'STANDARD' : 'VIP';
        for (let s = 1; s <= 16; s++) {
          seatsToInsert.push({
            auditoriumId,
            rowCode: row,
            seatNumber: s,
            seatLabel: `${row}${s}`,
            seatType,
          });
        }
      }
      for (let s = 1; s <= 4; s++) {
        seatsToInsert.push({
          auditoriumId,
          rowCode: 'M',
          seatNumber: s,
          seatLabel: `M${s * 2 - 1}-M${s * 2}`,
          seatType: 'COUPLE',
        });
      }
      seatsToInsert.push(
        { auditoriumId, rowCode: 'A', seatNumber: 17, seatLabel: 'W1', seatType: 'WHEELCHAIR', isWheelchair: true },
        { auditoriumId, rowCode: 'A', seatNumber: 18, seatLabel: 'W2', seatType: 'WHEELCHAIR', isWheelchair: true },
      );
    } else if (type === 'IMAX') {
      // 260 seats: rows A-M x 20. A-E standard (100), F-M VIP Sweetspot (160).
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
      for (const row of rows) {
        const seatType = ['A', 'B', 'C', 'D', 'E'].includes(row) ? 'STANDARD' : 'VIP';
        for (let s = 1; s <= 20; s++) {
          seatsToInsert.push({
            auditoriumId,
            rowCode: row,
            seatNumber: s,
            seatLabel: `${row}${s}`,
            seatType,
          });
        }
      }
      seatsToInsert.push(
        { auditoriumId, rowCode: 'A', seatNumber: 21, seatLabel: 'W1', seatType: 'WHEELCHAIR', isWheelchair: true },
        { auditoriumId, rowCode: 'A', seatNumber: 22, seatLabel: 'W2', seatType: 'WHEELCHAIR', isWheelchair: true },
      );
    } else if (type === 'LUXURY') {
      // 40 seats: rows A-E x 8, all RECLINER with side table
      const rows = ['A', 'B', 'C', 'D', 'E'];
      for (const row of rows) {
        for (let s = 1; s <= 8; s++) {
          seatsToInsert.push({
            auditoriumId,
            rowCode: row,
            seatNumber: s,
            seatLabel: `${row}${s}`,
            seatType: 'RECLINER',
          });
        }
      }
      seatsToInsert.push(
        { auditoriumId, rowCode: 'A', seatNumber: 9, seatLabel: 'W1', seatType: 'WHEELCHAIR', isWheelchair: true },
        { auditoriumId, rowCode: 'A', seatNumber: 10, seatLabel: 'W2', seatType: 'WHEELCHAIR', isWheelchair: true },
      );
    } else if (type === 'PRIVATE') {
      // 10 seats: 2 rows x 5 SOFA, WHOLE_ROOM
      const rows = ['A', 'B'];
      for (const row of rows) {
        for (let s = 1; s <= 5; s++) {
          seatsToInsert.push({
            auditoriumId,
            rowCode: row,
            seatNumber: s,
            seatLabel: `${row}${s}`,
            seatType: 'SOFA',
          });
        }
      }
    }

    await prisma.seat.createMany({ data: seatsToInsert });
  }

  // Seed Auditoriums for Cinema 1 (HUST Cine Đại Cồ Việt - All 5 types)
  const flagship = createdCinemas[0];

  const audStandard = await prisma.auditorium.create({
    data: {
      cinemaId: flagship.id,
      code: 'P01',
      name: 'Phòng 01 (Tiêu Chuẩn)',
      type: 'STANDARD',
      capacity: 120,
      priceMultiplier: 1.0,
      seatLayoutConfig: JSON.stringify({ rows: 10, cols: 12, screenCurved: true }),
    },
  });
  await generateSeatsForAuditorium(audStandard.id, 'STANDARD');

  const audGrand = await prisma.auditorium.create({
    data: {
      cinemaId: flagship.id,
      code: 'P02',
      name: 'Phòng 02 (Siêu Rộng Grand)',
      type: 'GRAND',
      capacity: 200,
      priceMultiplier: 1.2,
      seatLayoutConfig: JSON.stringify({ rows: 13, cols: 16, screenCurved: true }),
    },
  });
  await generateSeatsForAuditorium(audGrand.id, 'GRAND');

  const audImax = await prisma.auditorium.create({
    data: {
      cinemaId: flagship.id,
      code: 'P03',
      name: 'Phòng 03 (IMAX Laser)',
      type: 'IMAX',
      capacity: 260,
      priceMultiplier: 1.6,
      seatLayoutConfig: JSON.stringify({ rows: 13, cols: 20, stadiumRake: true, bestViewRows: ['G', 'H', 'I'] }),
    },
  });
  await generateSeatsForAuditorium(audImax.id, 'IMAX');

  const audLuxury = await prisma.auditorium.create({
    data: {
      cinemaId: flagship.id,
      code: 'P04',
      name: 'Phòng 04 (Luxury Recliner)',
      type: 'LUXURY',
      capacity: 40,
      priceMultiplier: 2.2,
      seatLayoutConfig: JSON.stringify({ rows: 5, cols: 8, inSeatOrdering: true }),
    },
  });
  await generateSeatsForAuditorium(audLuxury.id, 'LUXURY');

  const audPrivate = await prisma.auditorium.create({
    data: {
      cinemaId: flagship.id,
      code: 'P05',
      name: 'Phòng 05 (Private Lab)',
      type: 'PRIVATE',
      capacity: 10,
      bookingMode: 'WHOLE_ROOM',
      priceMultiplier: 1.0,
      seatLayoutConfig: JSON.stringify({ rows: 2, cols: 5, wholeRoomPrice: 650000 }),
    },
  });
  await generateSeatsForAuditorium(audPrivate.id, 'PRIVATE');

  // Seed Auditoriums for other cinemas (Standard + IMAX or Grand)
  for (let i = 1; i < createdCinemas.length; i++) {
    const cin = createdCinemas[i];
    const a1 = await prisma.auditorium.create({
      data: {
        cinemaId: cin.id,
        code: 'P01',
        name: 'Phòng 01 (Tiêu Chuẩn)',
        type: 'STANDARD',
        capacity: 120,
        priceMultiplier: 1.0,
        seatLayoutConfig: JSON.stringify({ rows: 10, cols: 12 }),
      },
    });
    await generateSeatsForAuditorium(a1.id, 'STANDARD');

    const a2 = await prisma.auditorium.create({
      data: {
        cinemaId: cin.id,
        code: 'P02',
        name: 'Phòng 02 (IMAX Laser)',
        type: 'IMAX',
        capacity: 260,
        priceMultiplier: 1.6,
        seatLayoutConfig: JSON.stringify({ rows: 13, cols: 20 }),
      },
    });
    await generateSeatsForAuditorium(a2.id, 'IMAX');
  }

  // 9. Combos
  await prisma.combo.createMany({
    data: [
      {
        name: 'Combo Bắp Nước Solo',
        description: '1 Bắp rang bơ thơm ngọt 60oz + 1 Nước ngọt có ga mát lạnh 32oz',
        price: 85000,
        imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500',
      },
      {
        name: 'Combo Couple Bách Khoa',
        description: '1 Bắp phô mai lớn 80oz + 2 Nước ngọt có ga 32oz + 1 Bánh snack que giòn rụm',
        price: 115000,
        imageUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=500',
      },
      {
        name: 'Combo Gia Đình HUST Family',
        description: '2 Bắp rang bơ caramel lớn + 3 Nước ngọt 32oz + 1 Xúc xích nướng Đức',
        price: 165000,
        imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=500',
      },
      {
        name: 'Bắp Phô Mai Thượng Hạng (Size L)',
        description: 'Bắp rang bơ giòn rụm áo đẫm bột phô mai Cheddar béo ngậy',
        price: 55000,
        imageUrl: null,
      },
      {
        name: 'Nước Ngọt Coca-Cola / Sprite / Fanta (Size L)',
        description: 'Ly lớn 32oz mát lạnh sảng khoái',
        price: 35000,
        imageUrl: null,
      },
    ],
  });

  // 10. Vouchers
  await prisma.voucher.createMany({
    data: [
      {
        code: 'SINHVIEN15',
        description: 'Giảm 15% tổng đơn cho sinh viên Bách Khoa có thẻ SV hợp lệ',
        discountPct: 15.0,
        minOrderAmount: 85000,
        maxDiscount: 50000,
        validFrom: new Date(Date.now() - 7 * 86400000),
        validTo: new Date(Date.now() + 60 * 86400000),
      },
      {
        code: 'HUSTHAPPY4',
        description: 'Đồng giá 65.000đ vé xem phim thứ 4 hàng tuần cho thành viên',
        discountAmount: 20000,
        minOrderAmount: 85000,
        validFrom: new Date(Date.now() - 7 * 86400000),
        validTo: new Date(Date.now() + 60 * 86400000),
      },
      {
        code: 'BKCOMBO20',
        description: 'Giảm 20% khi mua kèm combo bắp nước',
        discountPct: 20.0,
        minOrderAmount: 120000,
        maxDiscount: 40000,
        validFrom: new Date(Date.now() - 7 * 86400000),
        validTo: new Date(Date.now() + 60 * 86400000),
      },
    ],
  });

  // 11. Showtimes (Dynamic relative to NOW)
  // Today must contain all 5 states:
  // 1. ENDED: started 4h ago, ended 2h ago
  // 2. ONGOING: started 30m ago, ends in 90m
  // 3. CLOSED: starts in 3m (<= 5m cutoff)
  // 4. CLOSING_SOON: starts in 12m (between cutoff 5m and 15m)
  // 5. OPEN: starts later today (e.g. 18:30, 20:15, 21:45)
  // Plus 14 upcoming days.

  const now = new Date();
  const cyberMovieId = createdMovies['chien-binh-cong-nghe-ky-nguyen-moi'];
  const bachKhoaMovieId = createdMovies['ky-uc-bach-khoa'];
  const avatarMovieId = createdMovies['avatar-dong-chay-cua-nuoc'];

  const showtimeList: any[] = [];

  // 1. ENDED showtime
  showtimeList.push({
    movieId: cyberMovieId,
    cinemaId: flagship.id,
    auditoriumId: audStandard.id,
    format: '2D',
    startAt: new Date(now.getTime() - 4 * 3600000),
    endAt: new Date(now.getTime() - 2 * 3600000),
    basePrice: 85000,
  });

  // 2. ONGOING showtime
  showtimeList.push({
    movieId: bachKhoaMovieId,
    cinemaId: flagship.id,
    auditoriumId: audGrand.id,
    format: '2D',
    startAt: new Date(now.getTime() - 30 * 60000),
    endAt: new Date(now.getTime() + 80 * 60000),
    basePrice: 105000,
  });

  // 3. CLOSED showtime (starts in 3 minutes -> cutoff 5m is passed!)
  showtimeList.push({
    movieId: cyberMovieId,
    cinemaId: flagship.id,
    auditoriumId: audImax.id,
    format: 'IMAX',
    startAt: new Date(now.getTime() + 3 * 60000),
    endAt: new Date(now.getTime() + 131 * 60000),
    basePrice: 150000,
  });

  // 4. CLOSING_SOON showtime (starts in 12 minutes -> in [start - 15m, start - 5m])
  showtimeList.push({
    movieId: avatarMovieId,
    cinemaId: flagship.id,
    auditoriumId: audLuxury.id,
    format: '3D',
    startAt: new Date(now.getTime() + 12 * 60000),
    endAt: new Date(now.getTime() + 204 * 60000),
    basePrice: 250000,
  });

  // 5. OPEN showtime today (evening)
  showtimeList.push({
    movieId: cyberMovieId,
    cinemaId: flagship.id,
    auditoriumId: audImax.id,
    format: 'IMAX',
    startAt: new Date(now.getTime() + 4 * 3600000),
    endAt: new Date(now.getTime() + 6 * 3600000 + 8 * 60000),
    basePrice: 150000,
  });

  // 7. OPEN showtimes today for remaining NOW_SHOWING movies
  const latMatMovieId = createdMovies['lat-mat-7-mot-dieu-uoc'];
  const daoPhoMovieId = createdMovies['dao-pho-va-piano'];
  const spiderMovieId = createdMovies['spider-man-across-the-spider-verse'];
  const parallelMovieId = createdMovies['hanh-tinh-song-song'];

  if (spiderMovieId) {
    showtimeList.push({
      movieId: spiderMovieId,
      cinemaId: flagship.id,
      auditoriumId: audGrand.id,
      format: '2D',
      startAt: new Date(now.getTime() + 1.5 * 3600000),
      endAt: new Date(now.getTime() + 3.8 * 3600000),
      basePrice: 105000,
    });
  }

  if (latMatMovieId) {
    showtimeList.push({
      movieId: latMatMovieId,
      cinemaId: flagship.id,
      auditoriumId: audStandard.id,
      format: '2D',
      startAt: new Date(now.getTime() + 2 * 3600000),
      endAt: new Date(now.getTime() + 4.3 * 3600000),
      basePrice: 85000,
    });
  }

  if (daoPhoMovieId) {
    showtimeList.push({
      movieId: daoPhoMovieId,
      cinemaId: flagship.id,
      auditoriumId: audStandard.id,
      format: '2D',
      startAt: new Date(now.getTime() + 2.5 * 3600000),
      endAt: new Date(now.getTime() + 4.2 * 3600000),
      basePrice: 85000,
    });
  }

  if (parallelMovieId) {
    showtimeList.push({
      movieId: parallelMovieId,
      cinemaId: flagship.id,
      auditoriumId: audImax.id,
      format: 'IMAX',
      startAt: new Date(now.getTime() + 3 * 3600000),
      endAt: new Date(now.getTime() + 5.5 * 3600000),
      basePrice: 150000,
    });
  }

  // Active movies rotating across upcoming days
  const rotatingMovies = [
    cyberMovieId,
    bachKhoaMovieId,
    avatarMovieId,
    spiderMovieId,
    latMatMovieId,
    daoPhoMovieId,
    parallelMovieId,
  ].filter(Boolean);

  // Next 13 days of showtimes: 8 well-spaced showtimes per day
  for (let dayOffset = 1; dayOffset <= 13; dayOffset++) {
    const baseDay = new Date(now.getTime() + dayOffset * 86400000);
    baseDay.setHours(8, 0, 0, 0);

    const dailySlots = [
      { h: 8, m: 30, cinemaIdx: 0, audIdx: 0, format: '2D', price: 85000 },
      { h: 9, m: 30, cinemaIdx: 1, audIdx: 0, format: '2D', price: 85000 },
      { h: 11, m: 0, cinemaIdx: 0, audIdx: 1, format: '2D', price: 105000 },
      { h: 13, m: 30, cinemaIdx: 0, audIdx: 2, format: 'IMAX', price: 150000 },
      { h: 15, m: 0, cinemaIdx: 2, audIdx: 0, format: '2D', price: 85000 },
      { h: 17, m: 30, cinemaIdx: 3, audIdx: 0, format: '2D', price: 85000 },
      { h: 19, m: 15, cinemaIdx: 0, audIdx: 3, format: '2D', price: 250000 },
      { h: 21, m: 0, cinemaIdx: 4, audIdx: 0, format: '2D', price: 85000 },
    ];

    const allAuds = await prisma.auditorium.findMany({ where: { bookingMode: 'PER_SEAT' } });

    dailySlots.forEach((slot, slotIdx) => {
      const aud = allAuds[slotIdx % allAuds.length];
      const movieIdx = (dayOffset * 3 + slotIdx) % rotatingMovies.length;
      const movieId = rotatingMovies[movieIdx];

      const startAt = new Date(baseDay.getTime());
      startAt.setHours(slot.h, slot.m, 0, 0);
      const endAt = new Date(startAt.getTime() + 120 * 60000);

      showtimeList.push({
        movieId,
        cinemaId: aud.cinemaId,
        auditoriumId: aud.id,
        format: aud.type === 'IMAX' ? 'IMAX' : (aud.type === 'GRAND' ? '3D' : '2D'),
        startAt,
        endAt,
        basePrice: aud.type === 'IMAX' ? 150000 : (aud.type === 'LUXURY' ? 250000 : (aud.type === 'GRAND' ? 105000 : 85000)),
        isCancelled: false,
      });
    });
  }

  // Create showtimes and populate initial ShowtimeSeat rows in chunks
  console.log(`🎬 Creating ${showtimeList.length} showtimes with full seat matrices...`);
  for (const stData of showtimeList) {
    const st = await prisma.showtime.create({ data: stData });
    const seats = await prisma.seat.findMany({ where: { auditoriumId: st.auditoriumId } });

    const showtimeSeatsData = seats.map((s) => ({
      showtimeId: st.id,
      seatId: s.id,
      status: 'AVAILABLE',
    }));

    for (let i = 0; i < showtimeSeatsData.length; i += 500) {
      await prisma.showtimeSeat.createMany({ data: showtimeSeatsData.slice(i, i + 500) });
    }
  }

  console.log(`🎬 Created ${showtimeList.length} showtimes with full seat matrices.`);

  // 12. Demo PAID Booking for Customer
  const customerUser = await prisma.user.findFirst({ where: { email: 'customer@hust.edu.vn' } });
  const firstSt = await prisma.showtime.findFirst({
    where: { movieId: cyberMovieId, startAt: { gt: now } },
    include: { cinema: true, auditorium: true },
    orderBy: { startAt: 'asc' },
  });
  if (firstSt && customerUser) {
    const stSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: firstSt.id },
    });
    if (stSeat) {
      await prisma.booking.create({
        data: {
          bookingCode: '#HUST-DEMO-001',
          userId: customerUser.id,
          showtimeId: firstSt.id,
          cinemaId: firstSt.cinemaId,
          totalAmount: 95000,
          discountAmount: 0,
          finalAmount: 95000,
          status: 'PAID',
          qrTokenSigned: 'HUST-DEMO-TOKEN',
          expiresAt: new Date(Date.now() + 86400000),
          bookingSeats: {
            create: [
              {
                showtimeSeatId: stSeat.id,
                price: 95000,
              },
            ],
          },
        },
      });
      await prisma.showtimeSeat.update({
        where: { id: stSeat.id },
        data: { status: 'SOLD' },
      });
    }

    // Seed a past/watched booking with qrScannedAt
    const secondSt = await prisma.showtime.findFirst({
      where: { id: { not: firstSt.id } },
      include: { cinema: true, auditorium: true },
    });
    if (secondSt) {
      const pastSeat = await prisma.showtimeSeat.findFirst({
        where: { showtimeId: secondSt.id },
      });
      const firstCombo = await prisma.combo.findFirst();
      if (pastSeat) {
        await prisma.booking.create({
          data: {
            bookingCode: '#HUST-PAST-002',
            userId: customerUser.id,
            showtimeId: secondSt.id,
            cinemaId: secondSt.cinemaId,
            totalAmount: 145000,
            discountAmount: 0,
            finalAmount: 145000,
            status: 'PAID',
            qrTokenSigned: 'HUST-PAST-TOKEN',
            qrScannedAt: new Date(Date.now() - 86400000), // Watched / checked in yesterday
            expiresAt: new Date(Date.now() + 86400000),
            bookingSeats: {
              create: [
                {
                  showtimeSeatId: pastSeat.id,
                  price: 110000,
                },
              ],
            },
            ...(firstCombo
              ? {
                  bookingCombos: {
                    create: [
                      {
                        comboId: firstCombo.id,
                        quantity: 1,
                        unitPrice: 35000,
                      },
                    ],
                  },
                }
              : {}),
          },
        });
        await prisma.showtimeSeat.update({
          where: { id: pastSeat.id },
          data: { status: 'SOLD' },
        });
      }
    }
  }

  console.log('✅ HUST Cine Seed Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
