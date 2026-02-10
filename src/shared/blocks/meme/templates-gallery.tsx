'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Edit3, Eye, Loader2, Search, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

import { MEME_TEMPLATES } from './editor/templates-data';
import { MemeTemplate } from './editor/types';

interface SearchResult {
  id: string;
  name: string;
  imageUrl: string;
  textBoxCount: number;
}

interface TemplatesGalleryProps {
  className?: string;
}

export function TemplatesGallery({ className }: TemplatesGalleryProps) {
  const t = useTranslations('meme.templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(
    null
  );
  const [isSearching, startSearching] = useTransition();
  const [searchMethod, setSearchMethod] = useState<'local' | 'semantic'>(
    'local'
  );

  // Local filtering for instant results
  const localFilteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return MEME_TEMPLATES;
    return MEME_TEMPLATES.filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Use semantic results if available, otherwise local
  const filteredTemplates = useMemo(() => {
    if (searchMethod === 'semantic' && semanticResults) {
      // Map semantic results back to full template data
      return semanticResults
        .map((r) => MEME_TEMPLATES.find((t) => t.id === r.id))
        .filter((t): t is MemeTemplate => t !== undefined);
    }
    return localFilteredTemplates;
  }, [searchMethod, semanticResults, localFilteredTemplates]);

  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      toast.error(
        t('semantic_search_min_chars') || 'Please enter at least 3 characters'
      );
      return;
    }

    startSearching(async () => {
      try {
        const response = await fetch('/api/meme/search-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim(), limit: 20 }),
        });

        if (!response.ok) throw new Error('Search failed');

        const { code, data } = await response.json();
        if (code !== 0) throw new Error('Search failed');

        setSemanticResults(data.templates);
        setSearchMethod('semantic');

        if (data.templates.length === 0) {
          toast.info(
            t('no_semantic_results') ||
              'No matching templates found. Try different keywords.'
          );
        }
      } catch (error) {
        console.error('Semantic search error:', error);
        toast.error(
          t('semantic_search_error') || 'Search failed. Using local results.'
        );
      }
    });
  }, [searchQuery, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset to local search when typing
    if (searchMethod === 'semantic') {
      setSearchMethod('local');
      setSemanticResults(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 3) {
      handleSemanticSearch();
    }
  };

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
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl">
            {t('description')}
          </p>

          {/* Search */}
          <div className="mx-auto max-w-lg">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={
                    t('semantic_search_placeholder') ||
                    'Describe what you want to express... e.g. "feeling frustrated" or "celebrating a win"'
                  }
                  value={searchQuery}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSemanticSearch}
                disabled={isSearching || searchQuery.trim().length < 3}
                variant={searchMethod === 'semantic' ? 'default' : 'outline'}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" />
                    {t('ai_search') || 'AI Search'}
                  </>
                )}
              </Button>
            </div>
            {searchMethod === 'semantic' && semanticResults && (
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {t('showing_ai_results') || 'Showing AI-matched results'} •{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSearchMethod('local');
                    setSemanticResults(null);
                  }}
                  className="text-primary hover:underline"
                >
                  {t('show_all') || 'Show all templates'}
                </button>
              </p>
            )}
          </div>
        </motion.div>

        {/* Templates Count */}
        <div className="text-muted-foreground mb-6 text-sm">
          {t('showing_templates', { count: filteredTemplates.length })}
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="text-muted-foreground py-20 text-center"
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
      <div className="group">
        <div className="bg-muted hover:border-primary relative aspect-square overflow-hidden rounded-lg border transition-all hover:shadow-lg">
          <Image
            src={template.imageUrl}
            alt={template.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            unoptimized
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Link href={`/meme-editor/${template.id}`}>
              <Button size="sm" variant="secondary">
                <Edit3 className="mr-1 h-4 w-4" />
                {t('edit')}
              </Button>
            </Link>
            <Link href={`/templates/${template.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Eye className="mr-1 h-4 w-4" />
                {t('view_details') || 'Details'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Template Name */}
        <Link href={`/templates/${template.id}`}>
          <p className="hover:text-primary mt-2 line-clamp-1 text-sm font-medium transition-colors">
            {template.name}
          </p>
        </Link>
      </div>
    </motion.div>
  );
}
