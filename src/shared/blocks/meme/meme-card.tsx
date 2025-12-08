'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Meme } from '@/shared/models/meme';

interface MemeCardProps {
  meme: Meme;
  onLikeChange?: (memeId: string, liked: boolean) => void;
  onDelete?: (memeId: string) => void;
  showActions?: boolean;
  showAuthor?: boolean;
  className?: string;
}

export function MemeCard({
  meme,
  onLikeChange,
  onDelete,
  showActions = true,
  showAuthor = true,
  className,
}: MemeCardProps) {
  const t = useTranslations('meme.card');
  const { user, setIsShowSignModal } = useAppContext();
  
  const [isLiked, setIsLiked] = useState(meme.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(meme.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = user?.id === meme.userId;

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    const newLiked = !isLiked;

    // Optimistic update
    setIsLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      const resp = await fetch('/api/meme/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memeId: meme.id,
          action: newLiked ? 'like' : 'unlike',
        }),
      });

      const { code } = await resp.json();
      if (code !== 0) {
        // Revert on failure
        setIsLiked(!newLiked);
        setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
      } else {
        onLikeChange?.(meme.id, newLiked);
      }
    } catch {
      setIsLiked(!newLiked);
      setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/meme/${meme.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: meme.title || 'Check out this meme!',
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('confirm_delete'))) return;

    try {
      const resp = await fetch(`/api/meme/${meme.id}`, { method: 'DELETE' });
      const { code } = await resp.json();
      if (code === 0) {
        toast.success('Meme deleted');
        onDelete?.(meme.id);
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Link href={`/meme/${meme.id}`}>
        <Card className="group overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-primary/10">
          <CardContent className="p-0">
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={meme.thumbnailUrl || meme.imageUrl}
                alt={meme.title || 'Meme'}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div className="p-4">
              {showAuthor && meme.user && (
                <div className="mb-3 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={meme.user.image || ''} />
                    <AvatarFallback className="text-xs">
                      {meme.user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground text-sm">
                    {meme.user.name}
                  </span>
                </div>
              )}

              {meme.title && (
                <h3 className="mb-2 line-clamp-1 font-medium">{meme.title}</h3>
              )}

              {showActions && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 gap-1 px-2',
                        isLiked && 'text-red-500'
                      )}
                      onClick={handleLike}
                      disabled={isLiking}
                    >
                      <Heart
                        className={cn('h-4 w-4', isLiked && 'fill-current')}
                      />
                      <span className="text-xs">{likeCount}</span>
                    </Button>

                    <div className="text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">{meme.commentCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>

                    {isOwner && onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
