'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Download,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Meme } from '@/shared/models/meme';
import { MemeComment } from '@/shared/models/meme_comment';

interface MemeDetailProps {
  meme: Meme;
  className?: string;
}

export function MemeDetail({ meme: initialMeme, className }: MemeDetailProps) {
  const t = useTranslations('meme');
  const { user, setIsShowSignModal } = useAppContext();

  const [meme, setMeme] = useState(initialMeme);
  const [isLiked, setIsLiked] = useState(meme.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(meme.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [comments, setComments] = useState<MemeComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch comments on mount
  useState(() => {
    fetchComments();
  });

  async function fetchComments() {
    try {
      const resp = await fetch(`/api/meme/comment?memeId=${meme.id}`);
      const { code, data } = await resp.json();
      if (code === 0) {
        setComments(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }

  const handleLike = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    const newLiked = !isLiked;
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
        setIsLiked(!newLiked);
        setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
      }
    } catch {
      setIsLiked(!newLiked);
      setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(meme.imageUrl)}`
      );
      if (!resp.ok) throw new Error('Failed to fetch');

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `meme-${meme.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success(t('generator.success.downloaded'));
    } catch {
      toast.error(t('generator.error.download_failed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    const content = newComment.trim();
    if (!content) return;

    setIsSubmittingComment(true);
    try {
      const resp = await fetch('/api/meme/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeId: meme.id, content }),
      });
      const { code, data } = await resp.json();
      if (code === 0) {
        setComments((prev) => [{ ...data, user }, ...prev]);
        setNewComment('');
        setMeme((prev) => ({ ...prev, commentCount: prev.commentCount + 1 }));
        toast.success('Comment added!');
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <section className={cn('py-16 md:py-24', className)}>
      <div className="container">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
            {/* Meme Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-square w-full">
                    <Image
                      src={meme.imageUrl}
                      alt={meme.title || 'Meme'}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(isLiked && 'text-red-500 border-red-500')}
                    onClick={handleLike}
                    disabled={isLiking}
                  >
                    <Heart
                      className={cn('mr-1 h-4 w-4', isLiked && 'fill-current')}
                    />
                    {likeCount}
                  </Button>

                  <Button variant="outline" size="sm" disabled>
                    <MessageCircle className="mr-1 h-4 w-4" />
                    {meme.commentCount}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-1 h-4 w-4" />
                    {t('card.share')}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-4 w-4" />
                    )}
                    {t('generator.download')}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Author */}
              {meme.user && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={meme.user.image || ''} />
                        <AvatarFallback>
                          {meme.user.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{meme.user.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(meme.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {meme.title && (
                      <h1 className="mt-4 text-lg font-semibold">{meme.title}</h1>
                    )}
                    {meme.prompt && (
                      <p className="text-muted-foreground mt-2 text-sm">
                        {meme.prompt}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Comment Input */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 font-medium">{t('card.comment')}</h3>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      className="w-full"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Post Comment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Comments List */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-4 font-medium">
                    Comments ({meme.commentCount})
                  </h3>

                  {isLoadingComments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No comments yet. Be the first!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user?.image || ''} />
                            <AvatarFallback className="text-xs">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {comment.user?.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-1 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
