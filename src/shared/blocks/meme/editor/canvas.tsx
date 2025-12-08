'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Move } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { TextBox } from './types';

interface CanvasProps {
  imageUrl: string | null;
  textBoxes: TextBox[];
  selectedTextBoxId: string | null;
  onSelectTextBox: (id: string | null) => void;
  onUpdateTextBox: (id: string, updates: Partial<TextBox>) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
  className?: string;
}

export function MemeCanvas({
  imageUrl,
  textBoxes,
  selectedTextBoxId,
  onSelectTextBox,
  onUpdateTextBox,
  onCanvasSizeChange,
  className,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragTextBoxId, setDragTextBoxId] = useState<string | null>(null);

  // Calculate actual canvas dimensions maintaining aspect ratio
  const canvasSize = (() => {
    if (!imageSize.width || !imageSize.height) {
      return { width: containerSize.width, height: containerSize.width };
    }

    const aspectRatio = imageSize.width / imageSize.height;
    const maxWidth = containerSize.width;
    const maxHeight = containerSize.width; // Square container

    if (aspectRatio > 1) {
      // Wider than tall
      const width = Math.min(maxWidth, imageSize.width);
      return { width, height: width / aspectRatio };
    } else {
      // Taller than wide
      const height = Math.min(maxHeight, imageSize.height);
      return { width: height * aspectRatio, height };
    }
  })();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (canvasSize.width && canvasSize.height) {
      onCanvasSizeChange(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize.width, canvasSize.height, onCanvasSizeChange]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, textBoxId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragTextBoxId(textBoxId);
      setDragStart({ x: e.clientX, y: e.clientY });
      onSelectTextBox(textBoxId);
    },
    [onSelectTextBox]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragTextBoxId) return;

      const textBox = textBoxes.find((tb) => tb.id === dragTextBoxId);
      if (!textBox) return;

      const deltaX = ((e.clientX - dragStart.x) / canvasSize.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / canvasSize.height) * 100;

      const newX = Math.max(0, Math.min(100 - textBox.width, textBox.x + deltaX));
      const newY = Math.max(0, Math.min(100 - textBox.height, textBox.y + deltaY));

      onUpdateTextBox(dragTextBoxId, { x: newX, y: newY });
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragTextBoxId, textBoxes, dragStart, canvasSize, onUpdateTextBox]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTextBoxId(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onSelectTextBox(null);
      }
    },
    [onSelectTextBox]
  );

  const renderTextBox = (textBox: TextBox) => {
    const isSelected = textBox.id === selectedTextBoxId;
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${textBox.x}%`,
      top: `${textBox.y}%`,
      width: `${textBox.width}%`,
      minHeight: `${textBox.height}%`,
      fontSize: `${(textBox.fontSize / 500) * canvasSize.width}px`,
      fontFamily: textBox.fontFamily,
      fontWeight: textBox.fontWeight,
      color: textBox.fontColor,
      textAlign: textBox.textAlign,
      transform: `rotate(${textBox.rotation}deg)`,
      WebkitTextStroke: `${textBox.strokeWidth}px ${textBox.strokeColor}`,
      textShadow:
        textBox.shadowBlur > 0
          ? `0 0 ${textBox.shadowBlur}px ${textBox.shadowColor}`
          : 'none',
      lineHeight: 1.2,
      wordBreak: 'break-word',
      cursor: 'move',
      userSelect: 'none',
    };

    return (
      <div
        key={textBox.id}
        style={style}
        className={cn(
          'flex items-center justify-center p-1',
          isSelected && 'ring-2 ring-primary ring-offset-2 rounded'
        )}
        onMouseDown={(e) => handleMouseDown(e, textBox.id)}
      >
        <span
          style={{
            paintOrder: 'stroke fill',
          }}
        >
          {textBox.text || 'YOUR TEXT'}
        </span>
        {isSelected && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <Move className="h-3 w-3" />
            Drag to move
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center bg-muted/50 rounded-lg overflow-hidden',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {imageUrl ? (
        <div
          className="relative"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        >
          <Image
            src={imageUrl}
            alt="Meme template"
            fill
            className="object-contain"
            onLoad={handleImageLoad}
            unoptimized
          />
          {textBoxes.map(renderTextBox)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
          <p className="text-lg font-medium">No image selected</p>
          <p className="text-sm">Choose a template or upload your own image</p>
        </div>
      )}
    </div>
  );
}
