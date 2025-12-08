import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { MemeDetail } from '@/shared/blocks/meme/meme-detail';
import { getMetadata } from '@/shared/lib/seo';
import { findMemeById, incrementMemeViewCount } from '@/shared/models/meme';
import { findUserById } from '@/shared/models/user';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const meme = await findMemeById(id);

  if (!meme) {
    return {
      title: 'Meme Not Found',
    };
  }

  return {
    title: meme.title || 'Meme',
    description: meme.prompt || 'Check out this awesome meme!',
    openGraph: {
      title: meme.title || 'Meme',
      description: meme.prompt || 'Check out this awesome meme!',
      images: [{ url: meme.imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meme.title || 'Meme',
      description: meme.prompt || 'Check out this awesome meme!',
      images: [meme.imageUrl],
    },
  };
}

export default async function MemeDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const meme = await findMemeById(id);

  if (!meme || meme.status !== 'active') {
    notFound();
  }

  // Increment view count
  await incrementMemeViewCount(id);

  // Get user info
  const user = await findUserById(meme.userId);
  const memeWithUser = {
    ...meme,
    user: user || undefined,
  };

  return <MemeDetail meme={memeWithUser} />;
}
