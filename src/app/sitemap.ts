import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { MEME_TEMPLATES } from '@/shared/blocks/meme/editor/templates-data';

const staticPaths = [
  '/',
  '/pricing',
  '/templates',
  '/meme-generator',
  '/meme-editor',
  '/privacy',
  '/terms',
];

function buildUrl(baseUrl: string, path: string, locale: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) {
    return `${baseUrl}${normalizedPath}`;
  }

  if (normalizedPath === '/') {
    return `${baseUrl}/${locale}`;
  }

  return `${baseUrl}/${locale}${normalizedPath}`;
}

function getPriority(path: string): number {
  if (path === '/') return 1.0;
  if (path === '/templates' || path === '/meme-generator') return 0.9;
  if (path.startsWith('/templates/')) return 0.8;
  return 0.7;
}

function getChangeFrequency(
  path: string
): 'daily' | 'weekly' | 'monthly' | 'yearly' {
  if (path === '/' || path === '/templates') return 'daily';
  if (path.startsWith('/templates/')) return 'weekly';
  return 'monthly';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (envConfigs.app_url || 'http://localhost:3000').replace(
    /\/+$/,
    ''
  );
  const lastModified = new Date();

  const templatePaths = MEME_TEMPLATES.map(
    (template) => `/templates/${template.id}`
  );
  const allPaths = [...new Set([...staticPaths, ...templatePaths])];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of allPaths) {
      entries.push({
        url: buildUrl(baseUrl, path, locale),
        lastModified,
        changeFrequency: getChangeFrequency(path),
        priority: getPriority(path),
      });
    }
  }

  return entries;
}
