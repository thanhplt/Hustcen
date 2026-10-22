const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Generating comprehensive showtimes for all movies...');

  // 1. Fetch movies and cinemas
  const movies = await prisma.movie.findMany();
  const cinemas = await prisma.cinema.findMany({
    include: { auditoriums: true }
  });

  const movieBySlug = {};
  movies.forEach(m => { movieBySlug[m.slug] = m; });

  const activeMovies = [
    'chien-binh-cong-nghe-ky-nguyen-moi',
    'lat-mat-7-mot-dieu-uoc',
    'dao-pho-va-piano',
    'spider-man-across-the-spider-verse',
    'avatar-dong-chay-cua-nuoc',
    'ky-uc-bach-khoa',
    'hanh-tinh-song-song',
    'tham-tu-lung-danh-hanoi',
    'mat-ma-khong-gian',
  ].map(slug => movieBySlug[slug]).filter(Boolean);

  console.log(`Found ${activeMovies.length} active movies.`);

  // Cache seats for each auditorium
  const seatsByAuditorium = {};
  for (const c of cinemas) {
    for (const a of c.auditoriums) {
      const seats = await prisma.seat.findMany({ where: { auditoriumId: a.id } });
      seatsByAuditorium[a.id] = seats;
    }
  }

  // 2. Clear existing showtimes and showtime seats
  console.log('Clearing old showtimes...');
  await prisma.showtimeSeat.deleteMany({});
  await prisma.showtime.deleteMany({});

  // 3. Time setup: Asia/Ho_Chi_Minh is UTC+7
  // Current time: 2026-10-21
  const todayVnYear = 2026;
  const todayVnMonth = 9; // 0-indexed: 9 = October
  const todayVnDay = 21;

  const showtimeRecords = [];

  // Generate for Today (dayOffset = 0) and the next 13 days (dayOffset = 1 to 13)
  for (let dayOffset = 0; dayOffset <= 13; dayOffset++) {
    const isToday = dayOffset === 0;

    // Define time slots for this day in Vietnam local time (Hour, Minute)
    let slots;
    if (isToday) {
      // Tonight slots starting from 20:30, 21:00, 21:30, 22:00, 22:45
      slots = [
        { h: 20, m: 35 },
        { h: 21, m: 0 },
        { h: 21, m: 30 },
        { h: 22, m: 0 },
        { h: 22, m: 45 },
      ];
    } else {
      // Full schedule
      slots = [
        { h: 8, m: 30 },
        { h: 9, m: 15 },
        { h: 10, m: 0 },
        { h: 10, m: 45 },
        { h: 11, m: 30 },
        { h: 13, m: 0 },
        { h: 13, m: 45 },
        { h: 14, m: 30 },
        { h: 15, m: 15 },
        { h: 16, m: 0 },
        { h: 16, m: 45 },
        { h: 17, m: 30 },
        { h: 18, m: 15 },
        { h: 19, m: 0 },
        { h: 19, m: 45 },
        { h: 20, m: 30 },
        { h: 21, m: 15 },
        { h: 22, m: 0 },
        { h: 22, m: 45 },
      ];
    }

    // Distribute showtimes across all 5 cinemas
    for (const cinema of cinemas) {
      const auds = cinema.auditoriums;
      if (!auds || auds.length === 0) continue;

      slots.forEach((slot, slotIdx) => {
        // Pick an auditorium (round-robin)
        const aud = auds[slotIdx % auds.length];

        // Pick a movie
        const movieIdx = (dayOffset * 7 + slotIdx + cinemas.indexOf(cinema) * 3) % activeMovies.length;
        const movie = activeMovies[movieIdx];

        // Format
        let format = '2D';
        if (aud.type === 'IMAX') {
          format = 'IMAX';
        } else if (aud.type === 'GRAND' && (slotIdx % 2 === 1)) {
          format = '3D';
        }

        // Base price
        let basePrice = 85000;
        if (aud.type === 'IMAX') basePrice = 150000;
        else if (aud.type === 'LUXURY') basePrice = 250000;
        else if (aud.type === 'GRAND') basePrice = 105000;

        // Calculate UTC Date: VN time is UTC+7 -> UTC = VN - 7 hours
        // Construct Date directly in UTC
        const targetDate = new Date(Date.UTC(todayVnYear, todayVnMonth, todayVnDay + dayOffset, slot.h - 7, slot.m, 0));
        const durationMinutes = movie.durationMinutes || 120;
        const endDate = new Date(targetDate.getTime() + durationMinutes * 60000);

        showtimeRecords.push({
          movieId: movie.id,
          cinemaId: cinema.id,
          auditoriumId: aud.id,
          format,
          basePrice,
          startAt: targetDate,
          endAt: endDate,
          isCancelled: false,
        });
      });
    }
  }

  console.log(`Generated ${showtimeRecords.length} total showtime definitions.`);

  // 4. Batch insert showtimes and generate seats
  let count = 0;
  for (const stData of showtimeRecords) {
    const st = await prisma.showtime.create({ data: stData });
    const seats = seatsByAuditorium[st.auditoriumId] || [];

    const showtimeSeatsData = seats.map((s) => ({
      showtimeId: st.id,
      seatId: s.id,
      status: 'AVAILABLE',
    }));

    if (showtimeSeatsData.length > 0) {
      // Insert in chunks of 500 for SQLite safety
      for (let i = 0; i < showtimeSeatsData.length; i += 500) {
        const chunk = showtimeSeatsData.slice(i, i + 500);
        await prisma.showtimeSeat.createMany({ data: chunk });
      }
    }

    count++;
    if (count % 50 === 0 || count === showtimeRecords.length) {
      console.log(`Created ${count}/${showtimeRecords.length} showtimes...`);
    }
  }

  console.log(`🎉 Done! Successfully seeded ${count} showtimes across all movies, cinemas and dates.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error during showtime seeding:', err);
  process.exit(1);
});
