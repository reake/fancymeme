import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { MemeDetail } from '@/shared/blocks/meme/meme-detail';
import {
  findMemeById,
  incrementMemeViewCount,
  isMemeLikedByUser,
} from '@/shared/models/meme';
import { appendUserToResult, getUserInfo } from '@/shared/models/user';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) => {
  const { slug } = await params;
  const meme = await findMemeById(slug);

  if (!meme) {
    return {
      title: 'Meme',
      description: 'View meme details.',
    };
  }

  return {
    title: meme.title || 'Meme',
    description: meme.prompt || 'View meme details.',
  };
};

export default async function MemeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const meme = await findMemeById(slug);
  if (!meme) {
    notFound();
  }

  await incrementMemeViewCount(meme.id);

  const [withUser] = await appendUserToResult([meme]);
  const user = await getUserInfo();
  const isLiked = user ? await isMemeLikedByUser(user.id, meme.id) : false;

  return <MemeDetail meme={{ ...withUser, isLiked }} />;
}
