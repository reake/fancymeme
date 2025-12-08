import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { MemeGenerator } from '@/shared/blocks/meme/generator';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'meme.metadata',
  canonicalUrl: '/meme-generator',
});

export default async function MemeGeneratorPage({
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
        title: t.raw('page.title'),
        description: t.raw('page.description'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'hero background',
        },
      },
      generator: {
        component: <MemeGenerator srOnlyTitle={t.raw('generator.title')} />,
      },
      faq: tl.raw('faq'),
      cta: tl.raw('cta'),
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
