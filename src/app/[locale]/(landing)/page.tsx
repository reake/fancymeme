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
        title: t.raw('textToMeme.title'),
        description: t.raw('textToMeme.subtitle'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'meme generator background',
        },
        buttons: [
          {
            title: t.raw('textToMeme.generate'),
            url: '#generator',
            icon: 'Sparkles',
          },
          {
            title: t.raw('templates.title'),
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
        title: 'Why Choose FancyMeme',
        description: 'Create viral memes in seconds with AI-powered generation',
        items: [
          {
            title: 'AI-Powered Captions',
            description:
              'Our AI understands context and humor to generate perfect meme captions automatically.',
            icon: 'RiRobot2Line',
          },
          {
            title: '60+ Popular Templates',
            description:
              'Access a curated library of trending meme templates, from Drake to Distracted Boyfriend.',
            icon: 'RiImageLine',
          },
          {
            title: 'Instant Generation',
            description:
              'Generate multiple meme variations in seconds. No design skills required.',
            icon: 'RiFlashlightLine',
          },
          {
            title: 'Easy Customization',
            description:
              'Fine-tune your memes with our powerful editor. Adjust text, fonts, and more.',
            icon: 'RiEdit2Line',
          },
          {
            title: 'Share Anywhere',
            description:
              'Download in multiple formats optimized for Instagram, Twitter, and more.',
            icon: 'RiShareLine',
          },
          {
            title: 'Free to Start',
            description:
              'Try it free with no signup required. Upgrade for unlimited memes.',
            icon: 'RiGiftLine',
          },
        ],
      },
      faq: tl.raw('faq'),
      cta: {
        id: 'cta',
        title: 'Ready to Create Viral Memes?',
        description: 'Start generating AI-powered memes for free. No credit card required.',
        buttons: [
          {
            title: 'Start Creating',
            url: '#generator',
            icon: 'Sparkles',
          },
          {
            title: 'Browse Templates',
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
