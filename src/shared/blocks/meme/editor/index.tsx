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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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

  const [activeTab, setActiveTab] = useState<'gallery' | 'customize'>('gallery');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load template from URL slug
  useEffect(() => {
    if (templateSlug) {
      const template = MEME_TEMPLATES.find((t) => t.id === templateSlug);
      if (template) {
        setTemplate(template);
        setActiveTab('customize');
      }
    }
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
    (uploadedImageUrl: string) => {
      setCustomImage(uploadedImageUrl);
      setActiveTab('customize');
    },
    [setCustomImage]
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

        if (textBox.strokeWidth > 0) ctx.strokeText(textBox.text, textX, y, width);
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
          templateId: state.template?.id,
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
    <div className={cn('flex flex-col h-screen overflow-hidden', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Brand Header */}
      <header className="flex-shrink-0 h-14 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold hidden sm:inline">Meme Editor</span>
          </Link>
          
          {state.template && (
            <>
              <div className="w-px h-6 bg-border" />
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
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
        <aside className="w-80 flex-shrink-0 border-r bg-card flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'gallery' | 'customize')}
            className="flex flex-col h-full"
          >
            <TabsList className="w-full rounded-none border-b h-11 flex-shrink-0 bg-transparent p-0">
              <TabsTrigger
                value="gallery"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                {t('templates')}
              </TabsTrigger>
              <TabsTrigger
                value="customize"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                {t('customize')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="flex-1 m-0 overflow-hidden">
              <TemplateGallery
                onSelectTemplate={handleSelectTemplate}
                onUploadImage={handleUploadImage}
                selectedTemplateId={state.template?.id}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="customize" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                {!imageUrl ? (
                  <div className="flex flex-col items-center justify-center h-64 p-6 text-center text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Home className="w-8 h-8" />
                    </div>
                    <p className="text-sm">{t('select_template_first')}</p>
                  </div>
                ) : state.textBoxes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 p-6 text-center text-muted-foreground">
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
                  <div className="p-3 space-y-3">
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
                        <button
                          className="w-full px-3 py-2.5 flex items-center justify-between text-left"
                          onClick={() =>
                            selectTextBox(
                              state.selectedTextBoxId === textBox.id ? null : textBox.id
                            )
                          }
                        >
                          <span className="font-medium text-sm truncate flex-1">
                            {textBox.text || `${t('text')} #${index + 1}`}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTextBox(textBox.id);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTextBox(textBox.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {state.selectedTextBoxId === textBox.id && (
                          <div className="px-3 pb-3 border-t">
                            <TextCustomization
                              textBox={textBox}
                              onUpdate={(updates) => updateTextBox(textBox.id, updates)}
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
        <main className="flex-1 bg-muted/30 flex items-center justify-center p-4 md:p-8 overflow-auto">
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
