'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { Loader2, Search, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';

import { MEME_TEMPLATES } from './templates-data';
import { MemeTemplate } from './types';

interface TemplateGalleryProps {
  onSelectTemplate: (template: MemeTemplate) => void;
  onUploadImage: (imageUrl: string) => void;
  selectedTemplateId?: string | null;
  className?: string;
}

export function TemplateGallery({
  onSelectTemplate,
  onUploadImage,
  selectedTemplateId,
  className,
}: TemplateGalleryProps) {
  const t = useTranslations('meme.editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const filteredTemplates = MEME_TEMPLATES.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }

      setIsUploading(true);

      try {
        // Upload to storage
        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/storage/upload-image', {
          method: 'POST',
          body: formData,
        });

        const { code, data, message } = await resp.json();

        if (code === 0 && data?.url) {
          onUploadImage(data.url);
        } else {
          // Fallback to local blob URL
          const localUrl = URL.createObjectURL(file);
          onUploadImage(localUrl);
        }
      } catch {
        // Fallback to local blob URL
        const localUrl = URL.createObjectURL(file);
        onUploadImage(localUrl);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    },
    [onUploadImage]
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('search_templates')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <Label
            htmlFor="image-upload"
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors',
              'hover:border-primary hover:bg-primary/5',
              isUploading && 'cursor-not-allowed opacity-50'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {isUploading ? t('uploading') : t('upload_your_image')}
            </span>
          </Label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="mb-3 text-sm font-medium">{t('popular_templates')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-label={`Select template ${template.name}`}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                  'hover:border-primary hover:shadow-md',
                  selectedTemplateId === template.id
                    ? 'border-primary ring-primary/20 ring-2'
                    : 'border-transparent'
                )}
              >
                <Image
                  src={template.imageUrl}
                  alt={template.name}
                  fill
                  className="object-cover"
                  sizes="150px"
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="truncate text-xs font-medium text-white">
                    {template.name}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-muted-foreground py-8 text-center">
              {t('no_templates_found')}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
