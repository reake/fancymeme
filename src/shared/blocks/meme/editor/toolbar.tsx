'use client';

import {
  Download,
  Eraser,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  hasTextBoxes: boolean;
  onAddText: () => void;
  onClearText: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onUpload: () => void;
  onExport: () => void;
  onSave: () => void;
  isExporting?: boolean;
  isSaving?: boolean;
  className?: string;
}

export function EditorToolbar({
  canUndo,
  canRedo,
  hasImage,
  hasTextBoxes,
  onAddText,
  onClearText,
  onUndo,
  onRedo,
  onReset,
  onUpload,
  onExport,
  onSave,
  isExporting,
  isSaving,
  className,
}: ToolbarProps) {
  const t = useTranslations('meme.editor');

  const tools = [
    {
      icon: Plus,
      label: t('add_text'),
      onClick: onAddText,
      disabled: !hasImage,
    },
    {
      icon: Upload,
      label: t('upload_image'),
      onClick: onUpload,
      disabled: false,
    },
    {
      icon: Undo2,
      label: t('undo'),
      onClick: onUndo,
      disabled: !canUndo,
    },
    {
      icon: Redo2,
      label: t('redo'),
      onClick: onRedo,
      disabled: !canRedo,
    },
    {
      icon: Eraser,
      label: t('clear_text'),
      onClick: onClearText,
      disabled: !hasTextBoxes,
    },
    {
      icon: RotateCcw,
      label: t('reset'),
      onClick: onReset,
      disabled: !hasImage,
    },
  ];

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1 p-2 bg-card border rounded-lg',
          className
        )}
      >
        <div className="flex items-center gap-1 flex-1">
          {tools.map((tool, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  className="h-9 w-9"
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex items-center gap-2 border-l pl-2 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={!hasImage || isExporting}
          >
            <Download className="h-4 w-4 mr-1" />
            {isExporting ? t('exporting') : t('download')}
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!hasImage || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? t('saving') : t('share')}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
