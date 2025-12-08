'use client';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Trash2,
  Type,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Slider } from '@/shared/components/ui/slider';
import { Toggle } from '@/shared/components/ui/toggle';
import { cn } from '@/shared/lib/utils';

import { FONT_FAMILIES, FONT_SIZES, TextBox } from './types';

interface TextCustomizationProps {
  textBox: TextBox;
  onUpdate: (updates: Partial<TextBox>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  className?: string;
}

function SettingSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </div>
      {children}
    </div>
  );
}

export function TextCustomization({
  textBox,
  onUpdate,
  onRemove,
  onDuplicate,
  className,
}: TextCustomizationProps) {
  const t = useTranslations('meme.editor');

  return (
    <div className={cn('space-y-5', className)}>
      {/* Text Input */}
      <SettingSection title={t('text')} icon={Type}>
        <Input
          value={textBox.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder={t('enter_text')}
          className="bg-secondary/50"
        />
      </SettingSection>

      {/* Font Settings */}
      <SettingSection title={t('font')}>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={textBox.fontFamily}
            onValueChange={(value) => onUpdate({ fontFamily: value })}
          >
            <SelectTrigger className="bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={textBox.fontSize.toString()}
            onValueChange={(value) => onUpdate({ fontSize: parseInt(value) })}
          >
            <SelectTrigger className="bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingSection>

      {/* Colors */}
      <SettingSection title={t('text_color')}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="color"
              value={textBox.fontColor}
              onChange={(e) => onUpdate({ fontColor: e.target.value })}
              className="w-10 h-10 p-1 cursor-pointer rounded-lg border-2"
            />
          </div>
          <Input
            value={textBox.fontColor}
            onChange={(e) => onUpdate({ fontColor: e.target.value })}
            className="flex-1 bg-secondary/50 font-mono text-sm"
          />
        </div>
      </SettingSection>

      <SettingSection title={t('stroke_color')}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="color"
              value={textBox.strokeColor}
              onChange={(e) => onUpdate({ strokeColor: e.target.value })}
              className="w-10 h-10 p-1 cursor-pointer rounded-lg border-2"
            />
          </div>
          <Input
            value={textBox.strokeColor}
            onChange={(e) => onUpdate({ strokeColor: e.target.value })}
            className="flex-1 bg-secondary/50 font-mono text-sm"
          />
        </div>
      </SettingSection>

      {/* Stroke Width */}
      <SettingSection title={t('stroke_width')}>
        <div className="flex items-center gap-3">
          <Slider
            value={[textBox.strokeWidth]}
            onValueChange={([value]) => onUpdate({ strokeWidth: value })}
            min={0}
            max={10}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-8 text-right text-muted-foreground">
            {textBox.strokeWidth}
          </span>
        </div>
      </SettingSection>

      {/* Text Style */}
      <SettingSection title={t('style')}>
        <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
          <Toggle
            pressed={textBox.textAlign === 'left'}
            onPressedChange={() => onUpdate({ textAlign: 'left' })}
            aria-label="Align left"
            className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={textBox.textAlign === 'center'}
            onPressedChange={() => onUpdate({ textAlign: 'center' })}
            aria-label="Align center"
            className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={textBox.textAlign === 'right'}
            onPressedChange={() => onUpdate({ textAlign: 'right' })}
            aria-label="Align right"
            className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>
          <div className="w-px h-6 bg-border mx-1" />
          <Toggle
            pressed={textBox.fontWeight === 'bold'}
            onPressedChange={(pressed) =>
              onUpdate({ fontWeight: pressed ? 'bold' : 'normal' })
            }
            aria-label="Bold"
            className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
        </div>
      </SettingSection>

      {/* Rotation */}
      <SettingSection title={t('rotation')}>
        <div className="flex items-center gap-3">
          <Slider
            value={[textBox.rotation]}
            onValueChange={([value]) => onUpdate({ rotation: value })}
            min={-180}
            max={180}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-10 text-right text-muted-foreground">
            {textBox.rotation}°
          </span>
        </div>
      </SettingSection>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4 mr-1.5" />
          {t('duplicate')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          {t('remove')}
        </Button>
      </div>
    </div>
  );
}
