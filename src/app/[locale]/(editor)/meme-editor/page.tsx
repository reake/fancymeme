import { setRequestLocale } from 'next-intl/server';

import { MemeEditor } from '@/shared/blocks/meme/editor';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  metadataKey: 'meme.editor',
  canonicalUrl: '/meme-editor',
});

export default async function MemeEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MemeEditor />;
}
