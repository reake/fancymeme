import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Edit3,
  Layers,
  Share2,
  Sparkles,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Generate static params for all templates
export async function generateStaticParams() {
  return MEME_TEMPLATES.map((template) => ({
    slug: template.id,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const template = MEME_TEMPLATES.find((t) => t.id === slug);

  if (!template) {
    return {
      title: 'Template Not Found',
    };
  }

  const title = `${template.name} Meme Template | FancyMeme`;
  const description = `Create ${template.name} memes with AI. Customize text, download in high quality, and share on social media. Free online meme generator.`;

  const canonicalUrl = `${envConfigs.app_url}${locale !== defaultLocale ? `/${locale}` : ''}/templates/${slug}`;

  return {
    title,
    description,
    keywords: `${template.name}, meme template, ${template.name} meme, meme generator, create meme, funny memes`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonicalUrl,
      title,
      description,
      siteName: 'FancyMeme',
      images: [template.imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [template.imageUrl],
    },
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('meme');

  const template = MEME_TEMPLATES.find((t) => t.id === slug);

  if (!template) {
    notFound();
  }

  // Find related templates (same number of text boxes or random selection)
  const relatedTemplates = MEME_TEMPLATES.filter((t) => t.id !== slug)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  // Schema.org structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: `${template.name} Meme Template`,
    description: `Create ${template.name} memes with AI-powered meme generator`,
    contentUrl: template.imageUrl,
    thumbnailUrl: template.imageUrl,
    creator: {
      '@type': 'Organization',
      name: 'FancyMeme',
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mt-15 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/templates"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            {t('templates.title')}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{template.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Template Preview */}
          <div>
            <Card>
              <CardContent className="p-4">
                <img
                  src={template.imageUrl}
                  alt={`${template.name} meme template`}
                  className="aspect-square w-full rounded-lg object-contain"
                />
              </CardContent>
            </Card>

            {/* Template Info */}
            <div className="mt-4 space-y-2">
              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {template.defaultTextBoxes?.length || 2} text areas
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{template.name}</h1>
              <p className="text-muted-foreground mt-2">
                Create your own {template.name} meme with our AI-powered
                generator. Just describe your idea and let AI write the perfect
                captions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={`/meme-editor/${template.id}`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Template
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/meme-generator">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI
                </Link>
              </Button>
            </div>

            {/* Features */}
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">What you can do:</h3>
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  Let AI generate captions based on your idea
                </li>
                <li className="flex items-start gap-2">
                  <Edit3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  Customize text, fonts, colors, and positions
                </li>
                <li className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Download in high quality (PNG/JPEG)
                </li>
                <li className="flex items-start gap-2">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                  Share directly to social media
                </li>
              </ul>
            </div>

            {/* SEO Text Content */}
            <div className="prose prose-sm text-muted-foreground max-w-none">
              <h2 className="text-foreground text-lg font-semibold">
                About {template.name} Meme
              </h2>
              <p>
                The {template.name} meme template is one of the most popular
                formats for creating relatable and funny content. With{' '}
                {template.defaultTextBoxes?.length || 2} customizable text
                areas, you can express any comparison, reaction, or humorous
                situation.
              </p>
              <p>
                Use our AI-powered meme generator to automatically create
                captions, or customize each text box manually in our easy-to-use
                editor.
              </p>
            </div>
          </div>
        </div>

        {/* Related Templates */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Related Templates</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {relatedTemplates.map((related) => (
              <Link
                key={related.id}
                href={`/templates/${related.id}`}
                className="group overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
              >
                <img
                  src={related.imageUrl}
                  alt={`${related.name} meme template`}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="p-2">
                  <p className="line-clamp-1 text-sm font-medium">
                    {related.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
