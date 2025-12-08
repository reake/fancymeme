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
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              'flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
              'hover:border-primary hover:bg-primary/5',
              isUploading && 'opacity-50 cursor-not-allowed'
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
          <h3 className="text-sm font-medium mb-3">{t('popular_templates')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                  'hover:border-primary hover:shadow-md',
                  selectedTemplateId === template.id
                    ? 'border-primary ring-2 ring-primary/20'
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
                  <p className="text-white text-xs font-medium truncate">
                    {template.name}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t('no_templates_found')}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
