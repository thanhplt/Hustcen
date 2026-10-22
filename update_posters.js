const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const updates = [
  {
    slug: 'spider-man-across-the-spider-verse',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'lat-mat-7-mot-dieu-uoc',
    posterUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'avatar-dong-chay-cua-nuoc',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'dao-pho-va-piano',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eada?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'tham-tu-lung-danh-hanoi',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'cuoc-chien-luong-tu',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'nguoi-may-tro-ve',
    posterUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80'
  },
  {
    slug: 'giac-mo-dien-anh',
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80'
  }
];

async function main() {
  for (const item of updates) {
    await prisma.movie.updateMany({
      where: { slug: item.slug },
      data: {
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl
      }
    });
    console.log('Updated:', item.slug);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
