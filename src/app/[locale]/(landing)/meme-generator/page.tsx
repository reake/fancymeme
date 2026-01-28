import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { MemeGenerator } from '@/shared/blocks/meme/generator';
import { TextToMeme } from '@/shared/blocks/meme/text-to-meme';
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
        buttons: [
          {
            title: t.raw('templates.edit'),
            url: '/templates',
            variant: 'outline',
          },
        ],
      },
      textToMeme: {
        component: <TextToMeme showTitle={false} />,
      },
      aiGenerator: {
        component: (
          <div className="bg-muted py-16">
            <div className="container">
              <div className="mb-8 text-center">
                <h2 className="mb-3 text-2xl font-bold">
                  {t.raw('generator.title')} (AI Image)
                </h2>
                <p className="text-muted-foreground">
                  Generate completely new meme images with AI
                </p>
              </div>
            </div>
            <MemeGenerator srOnlyTitle={t.raw('generator.title')} />
          </div>
        ),
      },
      faq: tl.raw('faq'),
      cta: tl.raw('cta'),
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
