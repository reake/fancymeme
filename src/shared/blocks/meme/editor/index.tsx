'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Copy, Download, Home, Save, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { MemeCanvas } from './canvas';
import { TemplateGallery } from './template-gallery';
import { MEME_TEMPLATES } from './templates-data';
import { TextCustomization } from './text-customization';
import { EditorToolbar } from './toolbar';
import { MemeTemplate } from './types';
import { useEditor } from './use-editor';

interface MemeEditorProps {
  templateSlug?: string;
  className?: string;
}

export function MemeEditor({ templateSlug, className }: MemeEditorProps) {
  const t = useTranslations('meme.editor');
  const router = useRouter();
  const { user, setIsShowSignModal } = useAppContext();

  const {
    state,
    imageUrl,
    canUndo,
    canRedo,
    setTemplate,
    setCustomImage,
    addTextBox,
    updateTextBox,
    removeTextBox,
    duplicateTextBox,
    selectTextBox,
    setCanvasSize,
    clearAllText,
    undo,
    redo,
    reset,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<'gallery' | 'customize'>(
    'gallery'
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load template from URL slug
  useEffect(() => {
    if (!templateSlug) return;

    const template = MEME_TEMPLATES.find((t) => t.id === templateSlug);
    if (template) {
      setTemplate(template);
      setActiveTab('customize');
      return;
    }

    let cancelled = false;

    const fetchTemplate = async () => {
      try {
        const resp = await fetch(`/api/meme/templates/${templateSlug}`);
        const { code, data } = await resp.json();
        if (code !== 0 || !data) throw new Error('Template not found');

        if (cancelled) return;

        setTemplate({
          id: data.slug || templateSlug,
          templateId: data.id,
          name: data.name,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl || undefined,
          defaultTextBoxes: data.defaultTextBoxes || undefined,
        });
        setActiveTab('customize');
      } catch (error) {
        console.error('Failed to load template:', error);
      }
    };

    fetchTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateSlug, setTemplate]);

  const handleSelectTemplate = useCallback(
    (template: MemeTemplate) => {
      setTemplate(template);
      setActiveTab('customize');
      // Update URL
      router.push(`/meme-editor/${template.id}`, { scroll: false });
    },
    [setTemplate, router]
  );

  const handleUploadImage = useCallback(
    async (uploadedImageUrl: string) => {
      try {
        const resp = await fetch('/api/meme/templates/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: uploadedImageUrl,
            source: 'user',
          }),
        });

        const { code, data, message } = await resp.json();
        if (code !== 0 || !data?.slug) {
          throw new Error(message || 'Failed to create template');
        }

        router.push(`/meme-editor/${data.slug}`, { scroll: false });
      } catch (error) {
        console.error('Failed to create template from upload:', error);
        toast.error('Failed to save template. Editing locally.');
        setCustomImage(uploadedImageUrl);
        setActiveTab('customize');
      }
    },
    [router, setCustomImage]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/storage/upload-image', {
          method: 'POST',
          body: formData,
        });

        const { code, data } = await resp.json();

        if (code === 0 && data?.url) {
          handleUploadImage(data.url);
        } else {
          const localUrl = URL.createObjectURL(file);
          handleUploadImage(localUrl);
        }
      } catch {
        const localUrl = URL.createObjectURL(file);
        handleUploadImage(localUrl);
      }

      e.target.value = '';
    },
    [handleUploadImage]
  );

  const handleExport = useCallback(async () => {
    if (!imageUrl) return;

    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      state.textBoxes.forEach((textBox) => {
        const x = (textBox.x / 100) * canvas.width;
        const y = (textBox.y / 100) * canvas.height;
        const width = (textBox.width / 100) * canvas.width;
        const fontSize = (textBox.fontSize / 500) * canvas.width;

        ctx.save();

        const centerX = x + width / 2;
        const centerY = y + fontSize / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((textBox.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);

        ctx.font = `${textBox.fontWeight} ${fontSize}px ${textBox.fontFamily}`;
        ctx.fillStyle = textBox.fontColor;
        ctx.strokeStyle = textBox.strokeColor;
        ctx.lineWidth = textBox.strokeWidth * 2;
        ctx.textAlign = textBox.textAlign as CanvasTextAlign;
        ctx.textBaseline = 'top';

        let textX = x;
        if (textBox.textAlign === 'center') {
          textX = x + width / 2;
        } else if (textBox.textAlign === 'right') {
          textX = x + width;
        }

        if (textBox.strokeWidth > 0) {
          ctx.strokeText(textBox.text, textX, y, width);
        }
        ctx.fillText(textBox.text, textX, y, width);

        ctx.restore();
      });

      const link = document.createElement('a');
      link.download = `meme-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success(t('export_success'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('export_failed'));
    } finally {
      setIsExporting(false);
    }
  }, [imageUrl, state.textBoxes, t]);

  const handleSave = useCallback(async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!imageUrl) return;

    setIsSaving(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      state.textBoxes.forEach((textBox) => {
        const x = (textBox.x / 100) * canvas.width;
        const y = (textBox.y / 100) * canvas.height;
        const width = (textBox.width / 100) * canvas.width;
        const fontSize = (textBox.fontSize / 500) * canvas.width;

        ctx.save();
        const centerX = x + width / 2;
        const centerY = y + fontSize / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((textBox.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);

        ctx.font = `${textBox.fontWeight} ${fontSize}px ${textBox.fontFamily}`;
        ctx.fillStyle = textBox.fontColor;
        ctx.strokeStyle = textBox.strokeColor;
        ctx.lineWidth = textBox.strokeWidth * 2;
        ctx.textAlign = textBox.textAlign as CanvasTextAlign;
        ctx.textBaseline = 'top';

        let textX = x;
        if (textBox.textAlign === 'center') textX = x + width / 2;
        else if (textBox.textAlign === 'right') textX = x + width;

        if (textBox.strokeWidth > 0)
          ctx.strokeText(textBox.text, textX, y, width);
        ctx.fillText(textBox.text, textX, y, width);
        ctx.restore();
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const formData = new FormData();
      formData.append('file', blob, 'meme.png');

      const uploadResp = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResp.json();

      if (uploadData.code !== 0) {
        throw new Error('Upload failed');
      }

      const saveResp = await fetch('/api/meme/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          generationType: 'template',
          templateId: state.template?.templateId || null,
          textContent: state.textBoxes,
          isPublic: true,
        }),
      });

      const saveData = await saveResp.json();

      if (saveData.code === 0) {
        toast.success(t('save_success'));
      } else {
        throw new Error(saveData.message);
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error(t('save_failed'));
    } finally {
      setIsSaving(false);
    }
  }, [user, imageUrl, state.textBoxes, state.template, setIsShowSignModal, t]);

  const handleReset = useCallback(() => {
    reset();
    router.push('/meme-editor', { scroll: false });
  }, [reset, router]);

  return (
    <div className={cn('flex min-h-dvh flex-col overflow-hidden', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Brand Header */}
      <header className="bg-background flex h-14 flex-shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-sm font-bold">
                M
              </span>
            </div>
            <span className="hidden font-semibold sm:inline">Meme Editor</span>
          </Link>

          {state.template && (
            <>
              <div className="bg-border h-6 w-px" />
              <span className="text-muted-foreground max-w-[200px] truncate text-sm">
                {state.template.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <EditorToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            hasImage={!!imageUrl}
            hasTextBoxes={state.textBoxes.length > 0}
            onAddText={() => addTextBox()}
            onClearText={clearAllText}
            onUndo={undo}
            onRedo={redo}
            onReset={handleReset}
            onUpload={handleUploadClick}
            onExport={handleExport}
            onSave={handleSave}
            isExporting={isExporting}
            isSaving={isSaving}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="bg-card flex w-80 flex-shrink-0 flex-col border-r">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'gallery' | 'customize')}
            className="flex h-full flex-col"
          >
            <TabsList className="h-11 w-full flex-shrink-0 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="gallery"
                className="data-[state=active]:border-primary flex-1 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
              >
                {t('templates')}
              </TabsTrigger>
              <TabsTrigger
                value="customize"
                className="data-[state=active]:border-primary flex-1 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
              >
                {t('customize')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="m-0 flex-1 overflow-hidden">
              <TemplateGallery
                onSelectTemplate={handleSelectTemplate}
                onUploadImage={handleUploadImage}
                selectedTemplateId={state.template?.id}
                className="h-full"
              />
            </TabsContent>

            <TabsContent
              value="customize"
              className="m-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                {!imageUrl ? (
                  <div className="text-muted-foreground flex h-64 flex-col items-center justify-center p-6 text-center">
                    <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <Home className="h-8 w-8" />
                    </div>
                    <p className="text-sm">{t('select_template_first')}</p>
                  </div>
                ) : state.textBoxes.length === 0 ? (
                  <div className="text-muted-foreground flex h-64 flex-col items-center justify-center p-6 text-center">
                    <p className="text-sm">{t('no_text_boxes')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => addTextBox()}
                    >
                      {t('add_text')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 p-3">
                    {state.textBoxes.map((textBox, index) => (
                      <div
                        key={textBox.id}
                        className={cn(
                          'rounded-lg border transition-all',
                          state.selectedTextBoxId === textBox.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-muted-foreground/30'
                        )}
                      >
                        {/* Text Item Header */}
                        <div className="flex w-full items-center justify-between px-3 py-2.5 text-left">
                          <button
                            type="button"
                            aria-expanded={
                              state.selectedTextBoxId === textBox.id
                            }
                            aria-controls={`text-box-panel-${textBox.id}`}
                            className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                            onClick={() =>
                              selectTextBox(
                                state.selectedTextBoxId === textBox.id
                                  ? null
                                  : textBox.id
                              )
                            }
                          >
                            {textBox.text || `${t('text')} #${index + 1}`}
                          </button>
                          <div className="ml-2 flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('duplicate')}
                              className="h-7 w-7"
                              onClick={() => {
                                duplicateTextBox(textBox.id);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('remove')}
                              className="text-destructive hover:text-destructive h-7 w-7"
                              onClick={() => {
                                removeTextBox(textBox.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {state.selectedTextBoxId === textBox.id && (
                          <div
                            id={`text-box-panel-${textBox.id}`}
                            className="border-t px-3 pb-3"
                          >
                            <TextCustomization
                              textBox={textBox}
                              onUpdate={(updates) =>
                                updateTextBox(textBox.id, updates)
                              }
                              onRemove={() => removeTextBox(textBox.id)}
                              onDuplicate={() => duplicateTextBox(textBox.id)}
                              className="pt-3"
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Text Button */}
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => addTextBox()}
                    >
                      + {t('add_text')}
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Center Canvas Area */}
        <main className="bg-muted/30 flex flex-1 items-center justify-center overflow-auto p-4 md:p-8">
          <MemeCanvas
            imageUrl={imageUrl}
            textBoxes={state.textBoxes}
            selectedTextBoxId={state.selectedTextBoxId}
            onSelectTextBox={selectTextBox}
            onUpdateTextBox={updateTextBox}
            onCanvasSizeChange={setCanvasSize}
            className="w-full max-w-4xl"
          />
        </main>
      </div>
    </div>
  );
}

export * from './types';
export { MEME_TEMPLATES } from './templates-data';
