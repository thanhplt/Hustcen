import { redirect } from 'next/navigation';

export default function CinemaSlugPage({ params }: { params: { slug: string } }) {
  redirect(`/cum-rap?cinema=${params.slug}`);
}
