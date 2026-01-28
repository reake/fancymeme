'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

interface HeroMemeInputProps {
  className?: string;
}

export function HeroMemeInput({ className }: HeroMemeInputProps) {
  const t = useTranslations('meme.textToMeme');
  const router = useRouter();

  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      toast.error(t('error.empty_text'));
      return;
    }

    // For the hero input, redirect to the full generator page with the text pre-filled
    // This provides a seamless experience without loading the full generator on the homepage
    router.push(`/meme-generator?text=${encodeURIComponent(trimmedText)}`);
  }, [text, router, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  return (
    <div className={cn('mx-auto w-full max-w-2xl', className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Wand2 className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="h-12 pl-11 pr-4 text-base"
            disabled={isGenerating}
          />
        </div>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim()}
          className="h-12 min-w-36"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('generate')}
            </>
          )}
        </Button>
      </div>

      <p className="text-muted-foreground mt-3 text-center text-sm">
        {t('try_it_free')}
      </p>

      {/* Quick action links */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/templates"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Browse Templates
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href="/meme"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Community Memes
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
