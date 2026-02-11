import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { MemeEditor } from '@/shared/blocks/meme/editor';
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';
import { findMemeTemplateBySlug } from '@/shared/models/meme_template';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> => {
  const { locale, slug } = await params;
  const template =
    MEME_TEMPLATES.find((t) => t.id === slug) ||
    (await findMemeTemplateBySlug(slug));

  const normalizedSlug = slug.replace(/-/g, ' ').trim();
  const templateName = template?.name || normalizedSlug;
  const hasTemplate = Boolean(template);
  const canonicalPath = hasTemplate ? `/meme-editor/${slug}` : '/meme-editor';
  const canonicalUrl =
    locale !== defaultLocale
      ? `${envConfigs.app_url}/${locale}${canonicalPath}`
      : `${envConfigs.app_url}${canonicalPath}`;
  const previewImageUrl = envConfigs.app_preview_image.startsWith('http')
    ? envConfigs.app_preview_image
    : `${envConfigs.app_url}${envConfigs.app_preview_image}`;
  const imageUrl = template?.imageUrl
    ? template.imageUrl.startsWith('http')
      ? template.imageUrl
      : `${envConfigs.app_url}${template.imageUrl}`
    : previewImageUrl;

  const title = hasTemplate
    ? `${templateName} Meme Template Editor | FancyMeme`
    : 'Meme Editor Online: Add Text & Customize | FancyMeme';
  const description = hasTemplate
    ? `Create your own ${templateName} meme online with editable text boxes, fonts, and instant export. Use FancyMeme's free meme editor.`
    : 'Create custom memes online with editable text boxes, fonts, colors, and quick export using FancyMeme.';
  const keywords = hasTemplate
    ? `${templateName} meme, ${templateName} meme editor, ${templateName} meme generator, ${normalizedSlug} meme template, meme editor online, add text to meme, FancyMeme`
    : 'meme editor, edit meme online, add text to meme, meme maker, meme generator, FancyMeme';

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonicalUrl,
      title,
      description,
      siteName: envConfigs.app_name,
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: hasTemplate,
      follow: hasTemplate,
    },
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
