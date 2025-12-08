'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Edit3, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

import { MEME_TEMPLATES } from './editor/templates-data';
import { MemeTemplate } from './editor/types';

interface TemplatesGalleryProps {
  className?: string;
}

export function TemplatesGallery({ className }: TemplatesGalleryProps) {
  const t = useTranslations('meme.templates');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return MEME_TEMPLATES;
    return MEME_TEMPLATES.filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <section className={cn('py-16 md:py-24', className)}>
      <div className="container">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-4 md:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('description')}
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Templates Count */}
        <div className="mb-6 text-sm text-muted-foreground">
          {t('showing_templates', { count: filteredTemplates.length })}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTemplates.map((template, index) => (
              <TemplateCard key={template.id} template={template} index={index} />
            ))}
          </div>
        ) : (
          <motion.div
            className="py-20 text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>{t('no_results')}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  index,
}: {
  template: MemeTemplate;
  index: number;
}) {
  const t = useTranslations('meme.templates');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <Link
        href={`/meme-editor/${template.id}`}
        className="group block"
      >
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary hover:shadow-lg">
          <Image
            src={template.imageUrl}
            alt={template.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            unoptimized
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
            <Button size="sm" variant="secondary">
              <Edit3 className="h-4 w-4 mr-1" />
              {t('edit')}
            </Button>
          </div>
        </div>

        {/* Template Name */}
        <p className="mt-2 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
          {template.name}
        </p>
      </Link>
    </motion.div>
  );
}
