const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Seeding high-density cinema showtimes matching CGV/Bách Khoa reference...');

  // 1. Ensure movie subtitleInfo and formats
  const movieUpdates = [
    { slug: 'chien-binh-cong-nghe-ky-nguyen-moi', subtitleInfo: 'Phụ Đề Anh & Việt' },
    { slug: 'hanh-tinh-song-song', subtitleInfo: 'Phụ Đề Anh & Việt' },
    { slug: 'ky-uc-bach-khoa', subtitleInfo: 'Lồng Tiếng' },
    { slug: 'spider-man-across-the-spider-verse', subtitleInfo: 'Phụ Đề Anh & Việt' },
    { slug: 'lat-mat-7-mot-dieu-uoc', subtitleInfo: 'Phụ Đề Anh' },
    { slug: 'avatar-dong-chay-cua-nuoc', subtitleInfo: 'Phụ Đề Anh & Việt' },
    { slug: 'dao-pho-va-piano', subtitleInfo: 'Phụ Đề Anh' },
    { slug: 'mat-ma-khong-gian', subtitleInfo: 'Phụ Đề Anh & Việt' },
    { slug: 'tham-tu-lung-danh-hanoi', subtitleInfo: 'Phụ Đề Anh' },
    { slug: 'cuoc-chien-luong-tu', subtitleInfo: 'Phụ Đề Anh & Việt' },
  ];

  for (const mu of movieUpdates) {
    await prisma.movie.updateMany({
      where: { slug: mu.slug },
      data: { subtitleInfo: mu.subtitleInfo },
    });
  }

  // 2. Fetch movies and cinemas
  const movies = await prisma.movie.findMany();
  const cinemas = await prisma.cinema.findMany({
    include: { auditoriums: true },
  });

  console.log(`Found ${movies.length} movies and ${cinemas.length} cinemas.`);

  // 3. Helper to create standard seats if needed
  async function generateSeatsForAuditorium(auditoriumId, type) {
    const seatsToInsert = [];
    if (type === 'STANDARD') {
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
    } else if (type === 'GRAND') {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      for (const row of rows) {
        const seatType = ['A', 'B', 'C', 'D', 'E', 'F'].includes(row) ? 'STANDARD' : 'VIP';
        for (let s = 1; s <= 14; s++) {
          seatsToInsert.push({
            auditoriumId,
            rowCode: row,
            seatNumber: s,
            seatLabel: `${row}${s}`,
            seatType,
          });
        }
      }
    } else if (type === 'IMAX') {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      for (const row of rows) {
        const seatType = ['A', 'B', 'C', 'D'].includes(row) ? 'STANDARD' : 'VIP';
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
    } else {
      // LUXURY / CINE & FOREST
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
    }

    for (let i = 0; i < seatsToInsert.length; i += 200) {
      await prisma.seat.createMany({ data: seatsToInsert.slice(i, i + 200) });
    }
  }

  // 4. Ensure each cinema has the signature rooms matching illustration image:
  // - "Phòng 01 (Tiêu Chuẩn)" -> STANDARD
  // - "Phòng 02 (Rạp STARIUM)" -> GRAND
  // - "Phòng 03 (IMAX Laser)" -> IMAX
  // - "Phòng 04 (Rạp Cine & Forest)" -> LUXURY
  for (const cinema of cinemas) {
    let auds = cinema.auditoriums;

    // Check if STARIUM exists
    let starium = auds.find(a => a.name.includes('STARIUM') || a.type === 'GRAND');
    if (!starium) {
      starium = await prisma.auditorium.create({
        data: {
          cinemaId: cinema.id,
          code: 'P02',
          name: 'Phòng 02 (Rạp STARIUM)',
          type: 'GRAND',
          capacity: 168,
          priceMultiplier: 1.25,
          seatLayoutConfig: JSON.stringify({ rows: 12, cols: 14 }),
        },
      });
      await generateSeatsForAuditorium(starium.id, 'GRAND');
    } else if (!starium.name.includes('STARIUM')) {
      await prisma.auditorium.update({
        where: { id: starium.id },
        data: { name: 'Phòng 02 (Rạp STARIUM)' },
      });
    }

    // Check if Cine & Forest exists
    let forest = auds.find(a => a.name.includes('Cine & Forest') || (a.type === 'LUXURY' && a.code === 'P04'));
    if (!forest) {
      forest = await prisma.auditorium.create({
        data: {
          cinemaId: cinema.id,
          code: 'P04',
          name: 'Phòng 04 (Rạp Cine & Forest)',
          type: 'LUXURY',
          capacity: 40,
          priceMultiplier: 1.5,
          seatLayoutConfig: JSON.stringify({ rows: 5, cols: 8 }),
        },
      });
      await generateSeatsForAuditorium(forest.id, 'LUXURY');
    } else if (!forest.name.includes('Cine & Forest')) {
      await prisma.auditorium.update({
        where: { id: forest.id },
        data: { name: 'Phòng 04 (Rạp Cine & Forest)' },
      });
    }
  }

  // Refresh cinemas with updated auditoriums
  const refreshedCinemas = await prisma.cinema.findMany({
    include: { auditoriums: true },
  });

  // Pre-load seats for all auditoriums
  const seatsByAuditorium = {};
  for (const c of refreshedCinemas) {
    for (const a of c.auditoriums) {
      const seats = await prisma.seat.findMany({
        where: { auditoriumId: a.id },
        select: { id: true },
      });
      seatsByAuditorium[a.id] = seats;
    }
  }

  // 5. Clear existing showtimes & seats
  console.log('Clearing old bookings & showtimes...');
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingSeat.deleteMany({});
  await prisma.bookingCombo.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.showtimeSeat.deleteMany({});
  await prisma.showtime.deleteMany({});

  // 6. Define Movie Schedules
  // Today is 2026-10-22 (local VN time)
  const baseYear = 2026;
  const baseMonth = 9; // 0-indexed: 9 = October
  const baseDay = 22; // October 22, 2026

  const movieMap = {};
  movies.forEach(m => { movieMap[m.slug] = m; });

  // Main movies to schedule
  const scheduledMovies = [
    {
      slug: 'chien-binh-cong-nghe-ky-nguyen-moi',
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['10:50', '13:30', '16:30', '18:30', '19:10', '20:50'] },
        { audName: 'STARIUM', format: '2D', price: 110000, times: ['12:00', '14:40', '17:20', '20:00', '22:40'] },
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['11:10', '13:50', '17:40', '20:20'] },
        { audName: 'Cine & Forest', format: '2D', price: 160000, times: ['11:40', '14:20', '17:00', '21:40'] },
      ]
    },
    {
      slug: 'hanh-tinh-song-song',
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['18:00', '20:10', '21:10', '21:50', '23:10'] },
        { audName: 'Cine & Forest', format: '2D', price: 160000, times: ['19:40'] },
        { audName: 'STARIUM', format: '2D', price: 110000, times: ['13:10', '15:50', '18:40', '21:20'] },
      ]
    },
    {
      slug: 'lat-mat-7-mot-dieu-uoc',
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['10:45', '13:20', '16:00', '18:45', '21:30'] },
        { audName: 'STARIUM', format: '2D', price: 110000, times: ['11:15', '14:00', '16:45', '19:30', '22:15'] },
        { audName: 'Cine & Forest', format: '2D', price: 160000, times: ['12:30', '15:10', '18:00', '20:45'] },
      ]
    },
    {
      slug: 'spider-man-across-the-spider-verse',
      schedules: [
        { audType: 'IMAX', format: 'IMAX', price: 150000, times: ['10:15', '13:10', '16:15', '19:20', '22:15'] },
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['11:00', '14:00', '17:00', '20:00', '22:30'] },
      ]
    },
    {
      slug: 'avatar-dong-chay-cua-nuoc',
      schedules: [
        { audType: 'IMAX', format: 'IMAX', price: 165000, times: ['11:30', '15:30', '19:45'] },
        { audName: 'STARIUM', format: '3D', price: 120000, times: ['10:30', '14:30', '18:30', '22:30'] },
      ]
    },
    {
      slug: 'dao-pho-va-piano',
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 85000, times: ['11:15', '13:45', '16:15', '18:45', '21:15'] },
        { audName: 'Cine & Forest', format: '2D', price: 160000, times: ['13:00', '15:40', '18:20', '21:00'] },
      ]
    },
    {
      slug: 'ky-uc-bach-khoa',
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 75000, times: ['10:30', '12:45', '15:00', '17:15', '19:30', '21:45'] },
      ]
    },
    {
      slug: 'mat-ma-khong-gian', // Suất chiếu sớm / Sneak preview
      schedules: [
        { audName: 'STARIUM', format: '2D', price: 115000, times: ['19:00', '21:30'] },
        { audName: 'Cine & Forest', format: '2D', price: 160000, times: ['20:15', '22:30'] },
      ]
    },
    {
      slug: 'tham-tu-lung-danh-hanoi', // Suất chiếu sớm / Sneak preview
      schedules: [
        { audType: 'STANDARD', format: '2D', price: 90000, times: ['18:15', '20:45'] },
        { audType: 'IMAX', format: 'IMAX', price: 155000, times: ['21:00', '23:15'] },
      ]
    },
  ];

  const showtimeRecords = [];

  // Generate for 14 days (today + 13 days)
  for (let dayOffset = 0; dayOffset <= 13; dayOffset++) {
    for (const cinema of refreshedCinemas) {
      const auds = cinema.auditoriums;

      for (const sm of scheduledMovies) {
        const movie = movieMap[sm.slug];
        if (!movie) continue;

        for (const sched of sm.schedules) {
          // Find matching auditorium
          let aud = null;
          if (sched.audName) {
            aud = auds.find(a => a.name.toLowerCase().includes(sched.audName.toLowerCase()));
          }
          if (!aud && sched.audType) {
            aud = auds.find(a => a.type === sched.audType);
          }
          if (!aud) {
            aud = auds[0];
          }
          if (!aud) continue;

          for (const timeStr of sched.times) {
            const [hStr, mStr] = timeStr.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);

            // Calculate UTC start time: VN is UTC+7 -> UTC = VN - 7
            const startAt = new Date(Date.UTC(baseYear, baseMonth, baseDay + dayOffset, h - 7, m, 0));
            const duration = movie.durationMinutes || 120;
            const endAt = new Date(startAt.getTime() + duration * 60000);

            showtimeRecords.push({
              movieId: movie.id,
              cinemaId: cinema.id,
              auditoriumId: aud.id,
              format: sched.format,
              basePrice: sched.price,
              startAt,
              endAt,
              isCancelled: false,
            });
          }
        }
      }
    }
  }

  console.log(`Generated ${showtimeRecords.length} total showtimes across 14 days and 5 cinemas.`);

  // Insert showtimes in chunks and assign seats
  let count = 0;
  for (const stData of showtimeRecords) {
    const st = await prisma.showtime.create({ data: stData });
    const seats = seatsByAuditorium[st.auditoriumId] || [];

    const showtimeSeats = seats.map(s => ({
      showtimeId: st.id,
      seatId: s.id,
      status: 'AVAILABLE',
    }));

    if (showtimeSeats.length > 0) {
      for (let i = 0; i < showtimeSeats.length; i += 500) {
        await prisma.showtimeSeat.createMany({ data: showtimeSeats.slice(i, i + 500) });
      }
    }

    count++;
    if (count % 200 === 0 || count === showtimeRecords.length) {
      console.log(`Created ${count}/${showtimeRecords.length} showtimes...`);
    }
  }

  console.log(`🎉 Successfully seeded ${count} high-density showtimes!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
