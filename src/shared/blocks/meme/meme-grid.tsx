'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import { Meme } from '@/shared/models/meme';

import { MemeCard } from './meme-card';

interface MemeGridProps {
  initialMemes?: Meme[];
  userId?: string;
  showFilters?: boolean;
  showLoadMore?: boolean;
  className?: string;
}

type OrderBy = 'latest' | 'trending' | 'most_liked';

export function MemeGrid({
  initialMemes = [],
  userId,
  showFilters = true,
  showLoadMore = true,
  className,
}: MemeGridProps) {
  const t = useTranslations('meme.community');

  const [memes, setMemes] = useState<Meme[]>(initialMemes);
  const [orderBy, setOrderBy] = useState<OrderBy>('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(initialMemes.length === 0);

  const fetchMemes = useCallback(
    async (pageNum: number, order: OrderBy, reset = false) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '12',
          orderBy: order,
        });
        if (userId) params.set('userId', userId);

        const resp = await fetch(`/api/meme/list?${params}`);
        const { code, data } = await resp.json();

        if (code === 0) {
          const newMemes = data.items as Meme[];
          setMemes((prev) => (reset ? newMemes : [...prev, ...newMemes]));
          setHasMore(pageNum < data.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch memes:', error);
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (initialMemes.length === 0) {
      fetchMemes(1, orderBy, true);
    }
  }, [fetchMemes, orderBy, initialMemes.length]);

  const handleOrderChange = (value: string) => {
    const newOrder = value as OrderBy;
    setOrderBy(newOrder);
    setPage(1);
    fetchMemes(1, newOrder, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMemes(nextPage, orderBy);
  };

  const handleLikeChange = (memeId: string, liked: boolean) => {
    setMemes((prev) =>
      prev.map((m) =>
        m.id === memeId
          ? {
              ...m,
              isLiked: liked,
              likeCount: liked ? m.likeCount + 1 : m.likeCount - 1,
            }
          : m
      )
    );
  };

  const handleDelete = (memeId: string) => {
    setMemes((prev) => prev.filter((m) => m.id !== memeId));
  };

  return (
    <div className={cn('space-y-8', className)}>
      {showFilters && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs value={orderBy} onValueChange={handleOrderChange}>
            <TabsList>
              <TabsTrigger value="latest">{t('filters.latest')}</TabsTrigger>
              <TabsTrigger value="trending">{t('filters.trending')}</TabsTrigger>
              <TabsTrigger value="most_liked">
                {t('filters.most_liked')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>
      )}

      {isInitialLoad ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : memes.length === 0 ? (
        <motion.div
          className="py-20 text-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {t('empty')}
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {memes.map((meme, index) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onLikeChange={handleLikeChange}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {showLoadMore && hasMore && (
            <motion.div
              className="flex justify-center pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  t('load_more')
                )}
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
