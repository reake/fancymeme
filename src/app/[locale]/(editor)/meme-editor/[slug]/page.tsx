import { setRequestLocale } from 'next-intl/server';

import { MemeEditor } from '@/shared/blocks/meme/editor';
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) => {
  const { slug } = await params;
  const template = MEME_TEMPLATES.find((t) => t.id === slug);
  
  return {
    title: template ? `${template.name} - Meme Editor` : 'Meme Editor',
    description: template
      ? `Create your own ${template.name} meme with our easy-to-use editor`
      : 'Create custom memes with our easy-to-use editor',
  };
};

export default async function MemeEditorSlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return <MemeEditor templateSlug={slug} />;
}
