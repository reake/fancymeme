'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ArrowRight,
  Download,
  Edit3,
  Layers,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

interface TextArea {
  x?: number;
  y?: number;
  width?: number;
  text: string;
}

interface GeneratedMeme {
  id: string;
  templateId: string;
  templateName: string;
  imageUrl: string;
  textAreas: TextArea[];
  caption?: string;
  angle?: string; // For batch mode
}

interface TextToMemeProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
  defaultMode?: 'single' | 'batch';
}

const MAX_TEXT_LENGTH = 500;
const MAX_TOPIC_LENGTH = 200;

// Export size presets for social media
const EXPORT_SIZES = {
  original: { name: 'Original', ratio: null },
  square: { name: 'Square (1:1)', ratio: 1, width: 1080, height: 1080 },
  landscape: { name: 'Landscape (16:9)', ratio: 16 / 9, width: 1920, height: 1080 },
  portrait: { name: 'Portrait (9:16)', ratio: 9 / 16, width: 1080, height: 1920 },
  twitter: { name: 'Twitter (2:1)', ratio: 2, width: 1200, height: 600 },
} as const;

type ExportSizeKey = keyof typeof EXPORT_SIZES;

export function TextToMeme({
  className,
  showTitle = true,
  compact = false,
  defaultMode = 'single',
}: TextToMemeProps) {
  const t = useTranslations('meme.textToMeme');

  const [mode, setMode] = useState<'single' | 'batch'>(defaultMode);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [batchCount, setBatchCount] = useState('6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMemes, setGeneratedMemes] = useState<GeneratedMeme[]>([]);
  const [requiresWatermark, setRequiresWatermark] = useState(false);
  const [exportSize, setExportSize] = useState<ExportSizeKey>('original');
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const textLength = text.trim().length;
  const isTextTooLong = textLength > MAX_TEXT_LENGTH;
  const topicLength = topic.trim().length;
  const isTopicTooLong = topicLength > MAX_TOPIC_LENGTH;

  const handleGenerateSingle = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      toast.error(t('error.empty_text'));
      return;
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      toast.error(t('error.too_long'));
      return;
    }

    setIsGenerating(true);
    setGeneratedMemes([]);

    try {
      const response = await fetch('/api/meme/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText, count: 3 }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const { code, message, data } = await response.json();

      if (code !== 0) {
        throw new Error(message || 'Generation failed');
      }

      setGeneratedMemes(data.memes || []);
      setRequiresWatermark(data.requiresWatermark || false);

      if (data.memes && data.memes.length > 0) {
        toast.success(t('success.generated'));
      }
    } catch (error: any) {
      console.error('Failed to generate memes:', error);
      toast.error(t('error.failed'));
    } finally {
      setIsGenerating(false);
    }
  }, [text, t]);

  const handleGenerateBatch = useCallback(async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      toast.error(t('error.empty_topic'));
      return;
    }

    if (trimmedTopic.length > MAX_TOPIC_LENGTH) {
      toast.error(t('error.too_long'));
      return;
    }

    setIsGenerating(true);
    setGeneratedMemes([]);

    try {
      const response = await fetch('/api/meme/generate-by-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmedTopic, count: parseInt(batchCount, 10) }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const { code, message, data } = await response.json();

      if (code !== 0) {
        throw new Error(message || 'Generation failed');
      }

      setGeneratedMemes(data.memes || []);
      setRequiresWatermark(data.requiresWatermark || false);

      if (data.memes && data.memes.length > 0) {
        toast.success(t('success.generated'));
      }
    } catch (error: any) {
      console.error('Failed to generate batch memes:', error);
      toast.error(t('error.failed'));
    } finally {
      setIsGenerating(false);
    }
  }, [topic, batchCount, t]);

  const handleGenerate = mode === 'single' ? handleGenerateSingle : handleGenerateBatch;

  const renderMemeToCanvas = useCallback(
    async (meme: GeneratedMeme, sizeKey: ExportSizeKey = 'original'): Promise<HTMLCanvasElement | null> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const sizeConfig = EXPORT_SIZES[sizeKey];
          let targetWidth: number;
          let targetHeight: number;
          let drawX = 0;
          let drawY = 0;
          let drawWidth: number;
          let drawHeight: number;

          if (sizeConfig.ratio === null) {
            // Original size
            targetWidth = img.width;
            targetHeight = img.height;
            drawWidth = img.width;
            drawHeight = img.height;
          } else {
            // Fixed aspect ratio - crop to fit
            targetWidth = sizeConfig.width || 1080;
            targetHeight = sizeConfig.height || 1080;
            
            const imgRatio = img.width / img.height;
            const targetRatio = targetWidth / targetHeight;

            if (imgRatio > targetRatio) {
              // Image is wider - fit height, crop width
              drawHeight = targetHeight;
              drawWidth = img.width * (targetHeight / img.height);
              drawX = (targetWidth - drawWidth) / 2;
            } else {
              // Image is taller - fit width, crop height
              drawWidth = targetWidth;
              drawHeight = img.height * (targetWidth / img.width);
              drawY = (targetHeight - drawHeight) / 2;
            }
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Fill background (for cropped areas)
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Draw background image (centered/cropped)
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

          // Draw text boxes (adjust positions based on original image dimensions)
          meme.textAreas.forEach((textArea) => {
            // Calculate position relative to drawn image area
            const x = drawX + ((textArea.x ?? 5) / 100) * drawWidth;
            const y = drawY + ((textArea.y ?? 50) / 100) * drawHeight;
            const width = ((textArea.width ?? 90) / 100) * drawWidth;
            const fontSize = Math.max(20, targetWidth * 0.05);

            ctx.save();

            // Text style - classic meme style
            ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = fontSize * 0.1;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textX = x + width / 2;

            // Word wrap for long text
            const words = textArea.text.toUpperCase().split(' ');
            let lines: string[] = [];
            let currentLine = '';
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const metrics = ctx.measureText(testLine);
              if (metrics.width > width && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);

            // Draw each line
            lines.forEach((line, i) => {
              const lineY = y + i * (fontSize * 1.2);
              ctx.strokeText(line, textX, lineY, width);
              ctx.fillText(line, textX, lineY, width);
            });

            ctx.restore();
          });

          // Add watermark if required
          if (requiresWatermark) {
            ctx.save();
            
            // Semi-transparent background for watermark
            const wmFontSize = Math.max(14, targetWidth * 0.025);
            const wmText = 'FancyMeme.com';
            ctx.font = `bold ${wmFontSize}px Arial, sans-serif`;
            const wmWidth = ctx.measureText(wmText).width + 16;
            const wmHeight = wmFontSize + 8;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(
              targetWidth - wmWidth - 8,
              targetHeight - wmHeight - 8,
              wmWidth,
              wmHeight
            );
            
            // Watermark text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(wmText, targetWidth - 16, targetHeight - 12);
            ctx.restore();
          }

          resolve(canvas);
        };

        img.onerror = () => {
          console.error('Failed to load image:', meme.imageUrl);
          resolve(null);
        };

        // Use proxy for external images
        if (meme.imageUrl.startsWith('http')) {
          img.src = `/api/proxy/file?url=${encodeURIComponent(meme.imageUrl)}`;
        } else {
          img.src = meme.imageUrl;
        }
      });
    },
    [requiresWatermark]
  );

  const handleDownload = useCallback(
    async (meme: GeneratedMeme, sizeKey?: ExportSizeKey) => {
      try {
        const canvas = await renderMemeToCanvas(meme, sizeKey || exportSize);
        if (!canvas) {
          toast.error('Failed to render meme');
          return;
        }

        const sizeSuffix = sizeKey && sizeKey !== 'original' ? `-${sizeKey}` : '';
        const link = document.createElement('a');
        link.download = `meme-${meme.id}${sizeSuffix}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast.success(t('download'));
      } catch (error) {
        console.error('Failed to download:', error);
        toast.error('Download failed');
      }
    },
    [renderMemeToCanvas, exportSize, t]
  );

  const handleShare = useCallback(
    async (meme: GeneratedMeme) => {
      try {
        const canvas = await renderMemeToCanvas(meme);
        if (!canvas) {
          toast.error('Failed to render meme');
          return;
        }

        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (!blob) {
          toast.error('Failed to create image');
          return;
        }

        // Try Web Share API
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `meme-${meme.id}.png`, {
            type: 'image/png',
          });
          const shareData = { files: [file] };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }

        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('Copied to clipboard!');
      } catch (error) {
        console.error('Failed to share:', error);
        // Silent fail for share cancel
      }
    },
    [renderMemeToCanvas]
  );

  return (
    <section className={cn('py-8 md:py-12', className)}>
      <div className="container">
        <div className="mx-auto max-w-4xl">
          {showTitle && (
            <div className="mb-8 text-center">
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                <Wand2 className="mr-3 inline-block h-8 w-8" />
                {t('title')}
              </h2>
              <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
            </div>
          )}

          {/* Input Section */}
          <Card className="mb-8">
            <CardContent className={compact ? 'p-4' : 'p-6'}>
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'batch')} className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="single" className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    {t('mode.single')}
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {t('mode.batch')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('placeholder')}
                    className="min-h-24 resize-none text-lg"
                    disabled={isGenerating}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span>
                        {textLength} / {MAX_TEXT_LENGTH}
                      </span>
                      {isTextTooLong && (
                        <span className="text-destructive">
                          {t('error.too_long')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {generatedMemes.length > 0 && mode === 'single' && (
                        <Button
                          variant="outline"
                          onClick={handleGenerateSingle}
                          disabled={isGenerating || !text.trim() || isTextTooLong}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('regenerate')}
                        </Button>
                      )}

                      <Button
                        size="lg"
                        onClick={handleGenerateSingle}
                        disabled={isGenerating || !text.trim() || isTextTooLong}
                        className="min-w-40"
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
                  </div>
                </TabsContent>

                <TabsContent value="batch" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">{t('batch.title')}</Label>
                    <p className="text-muted-foreground text-sm">{t('batch.subtitle')}</p>
                  </div>

                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('batch.topic_placeholder')}
                    className="h-12 text-lg"
                    disabled={isGenerating}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="count" className="text-muted-foreground text-sm whitespace-nowrap">
                        {t('batch.count_label')}
                      </Label>
                      <Select value={batchCount} onValueChange={setBatchCount} disabled={isGenerating}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="9">9</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                        </SelectContent>
                      </Select>
                      {isTopicTooLong && (
                        <span className="text-destructive text-sm">
                          {t('error.too_long')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {generatedMemes.length > 0 && mode === 'batch' && (
                        <Button
                          variant="outline"
                          onClick={handleGenerateBatch}
                          disabled={isGenerating || !topic.trim() || isTopicTooLong}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('regenerate')}
                        </Button>
                      )}

                      <Button
                        size="lg"
                        onClick={handleGenerateBatch}
                        disabled={isGenerating || !topic.trim() || isTopicTooLong}
                        className="min-w-40"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('generating')}
                          </>
                        ) : (
                          <>
                            <Layers className="mr-2 h-4 w-4" />
                            {t('generate')} ({batchCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {!compact && (
                <p className="text-muted-foreground mt-4 text-center text-sm">
                  {t('try_it_free')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {(generatedMemes.length > 0 || isGenerating) && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold">{t('results_title')}</h3>
                
                {/* Export Size Selector */}
                {generatedMemes.length > 0 && !isGenerating && (
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground text-sm whitespace-nowrap">
                      {t('export.size_label') || 'Export size:'}
                    </Label>
                    <Select value={exportSize} onValueChange={(v) => setExportSize(v as ExportSizeKey)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXPORT_SIZES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isGenerating ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
                    <p className="text-muted-foreground">{t('generating')}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {generatedMemes.map((meme) => (
                    <MemePreviewCard
                      key={meme.id}
                      meme={meme}
                      requiresWatermark={requiresWatermark}
                      onDownload={() => handleDownload(meme)}
                      onShare={() => handleShare(meme)}
                      t={t}
                    />
                  ))}
                </div>
              )}

              {requiresWatermark && generatedMemes.length > 0 && (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    {t('watermark_notice')}
                  </p>
                  <Link href="/sign-up">
                    <Button variant="outline" size="sm">
                      Sign up for free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {generatedMemes.length === 0 && !isGenerating && (
            <div className="py-12 text-center">
              <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Wand2 className="text-muted-foreground h-8 w-8" />
              </div>
              <p className="text-muted-foreground">{t('no_results')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Meme Preview Card Component
function MemePreviewCard({
  meme,
  requiresWatermark,
  onDownload,
  onShare,
  t,
}: {
  meme: GeneratedMeme;
  requiresWatermark: boolean;
  onDownload: () => void;
  onShare: () => void;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Render meme preview to canvas
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Set canvas size maintaining aspect ratio
      const maxWidth = 400;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      // Draw background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw text boxes
      meme.textAreas.forEach((textArea) => {
        const x = ((textArea.x ?? 5) / 100) * canvas.width;
        const y = ((textArea.y ?? 50) / 100) * canvas.height;
        const width = ((textArea.width ?? 90) / 100) * canvas.width;
        const fontSize = Math.max(14, canvas.width * 0.05);

        ctx.save();

        // Text style - classic meme style
        ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = fontSize * 0.1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const textX = x + width / 2;

        // Draw text with stroke
        const upperText = textArea.text.toUpperCase();
        ctx.strokeText(upperText, textX, y, width);
        ctx.fillText(upperText, textX, y, width);

        ctx.restore();
      });

      // Add watermark if required
      if (requiresWatermark) {
        ctx.save();
        ctx.font = `${canvas.width * 0.035}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('fancymeme.com', canvas.width - 8, canvas.height - 8);
        ctx.restore();
      }

      setIsLoaded(true);
    };

    // Use proxy for external images
    if (meme.imageUrl.startsWith('http')) {
      img.src = `/api/proxy/file?url=${encodeURIComponent(meme.imageUrl)}`;
    } else {
      img.src = meme.imageUrl;
    }
  }, [meme, requiresWatermark]);

  // Render on mount and when meme changes
  useState(() => {
    renderPreview();
  });

  // Also trigger on first render
  if (!isLoaded) {
    setTimeout(renderPreview, 0);
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-square bg-gray-100">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
        {!isLoaded && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <p className="text-muted-foreground mb-3 truncate text-xs">
          {t('template_used', { name: meme.templateName })}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onDownload}
          >
            <Download className="mr-1 h-3 w-3" />
            {t('download')}
          </Button>

          <Link href={`/meme-editor/${meme.templateId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Edit3 className="mr-1 h-3 w-3" />
              {t('edit')}
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={onShare}>
            <Share2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
