import { getTranslations, setRequestLocale } from 'next-intl/server';

import { TemplatesGallery } from '@/shared/blocks/meme/templates-gallery';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  metadataKey: 'meme.templates',
  canonicalUrl: '/templates',
});

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TemplatesGallery />;
}
