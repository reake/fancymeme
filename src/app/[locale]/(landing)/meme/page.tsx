import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { MemeGrid } from '@/shared/blocks/meme/meme-grid';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'meme.community',
  canonicalUrl: '/meme',
});

export default async function MemeCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('meme');
  const tl = await getTranslations('landing');

  const page: DynamicPage = {
    sections: {
      hero: {
        title: t.raw('community.title'),
        description: t.raw('community.description'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'meme community background',
        },
        buttons: [
          {
            title: t.raw('generator.generate'),
            url: '/meme-generator',
            variant: 'default',
          },
        ],
      },
      memeGrid: {
        component: <MemeGrid />,
      },
      cta: tl.raw('cta'),
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
