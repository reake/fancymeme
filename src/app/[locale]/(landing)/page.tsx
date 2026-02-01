import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { TextToMeme } from '@/shared/blocks/meme/text-to-meme';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  canonicalUrl: '/',
});

export const revalidate = 3600;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('meme');
  const tl = await getTranslations('landing');

  // Meme-focused landing page
  const page: DynamicPage = {
    sections: {
      hero: {
        title: t.raw('hero.title'),
        description: t.raw('hero.subtitle'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'FancyMeme - AI Meme Generator',
        },
        buttons: [
          {
            title: t.raw('hero.cta_primary'),
            url: '#generator',
            icon: 'Sparkles',
          },
          {
            title: t.raw('hero.cta_secondary'),
            url: '/templates',
            variant: 'outline',
            icon: 'Image',
          },
        ],
      },
      textToMeme: {
        id: 'generator',
        component: <TextToMeme showTitle={false} />,
      },
      features: {
        id: 'features',
        title: t.raw('features.title'),
        description: t.raw('features.subtitle'),
        items: [
          {
            title: t.raw('features.items.text_to_meme.title'),
            description: t.raw('features.items.text_to_meme.description'),
            icon: 'RiMagicLine',
          },
          {
            title: t.raw('features.items.smart_match.title'),
            description: t.raw('features.items.smart_match.description'),
            icon: 'RiBrainLine',
          },
          {
            title: t.raw('features.items.emotion_search.title'),
            description: t.raw('features.items.emotion_search.description'),
            icon: 'RiSearchEyeLine',
          },
          {
            title: t.raw('features.items.templates.title'),
            description: t.raw('features.items.templates.description'),
            icon: 'RiImageLine',
          },
          {
            title: t.raw('features.items.export.title'),
            description: t.raw('features.items.export.description'),
            icon: 'RiShareLine',
          },
          {
            title: t.raw('features.items.free.title'),
            description: t.raw('features.items.free.description'),
            icon: 'RiGiftLine',
          },
        ],
      },
      useCases: {
        id: 'use-cases',
        title: t.raw('useCases.title'),
        description: t.raw('useCases.subtitle'),
        items: [
          {
            title: t.raw('useCases.items.social_media.title'),
            description: t.raw('useCases.items.social_media.description'),
            icon: 'RiInstagramLine',
          },
          {
            title: t.raw('useCases.items.team.title'),
            description: t.raw('useCases.items.team.description'),
            icon: 'RiTeamLine',
          },
          {
            title: t.raw('useCases.items.content.title'),
            description: t.raw('useCases.items.content.description'),
            icon: 'RiQuillPenLine',
          },
          {
            title: t.raw('useCases.items.fun.title'),
            description: t.raw('useCases.items.fun.description'),
            icon: 'RiEmotionLaughLine',
          },
        ],
      },
      faq: tl.raw('faq'),
      cta: {
        id: 'cta',
        title: t.raw('cta.title'),
        description: t.raw('cta.subtitle'),
        buttons: [
          {
            title: t.raw('cta.button_primary'),
            url: '#generator',
            icon: 'Sparkles',
          },
          {
            title: t.raw('cta.button_secondary'),
            url: '/templates',
            variant: 'outline',
            icon: 'Image',
          },
        ],
        className: 'bg-muted',
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
