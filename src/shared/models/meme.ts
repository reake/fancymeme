import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { meme, memeFavorite, memeLike } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export type Meme = typeof meme.$inferSelect & {
  user?: User;
  isLiked?: boolean;
  isFavorited?: boolean;
};
export type NewMeme = typeof meme.$inferInsert;
export type UpdateMeme = Partial<Omit<NewMeme, 'id' | 'createdAt' | 'userId'>>;

export enum MemeStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  DELETED = 'deleted',
}

export enum MemeGenerationType {
  AI = 'ai',
  TEMPLATE = 'template',
  UPLOAD = 'upload',
}

export async function createMeme(newMeme: NewMeme): Promise<Meme> {
  const [result] = await db().insert(meme).values(newMeme).returning();
  return result;
}

export async function findMemeById(id: string): Promise<Meme | undefined> {
  const [result] = await db().select().from(meme).where(eq(meme.id, id));
  return result;
}

export async function updateMemeById(
  id: string,
  updateData: UpdateMeme
): Promise<Meme | undefined> {
  const [result] = await db()
    .update(meme)
    .set(updateData)
    .where(eq(meme.id, id))
    .returning();
  return result;
}

export async function deleteMemeById(id: string): Promise<void> {
  await db()
    .update(meme)
    .set({ status: MemeStatus.DELETED, deletedAt: new Date() })
    .where(eq(meme.id, id));
}

export async function getMemesCount({
  userId,
  status,
  isPublic,
  generationType,
}: {
  userId?: string;
  status?: string;
  isPublic?: boolean;
  generationType?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(meme)
    .where(
      and(
        userId ? eq(meme.userId, userId) : undefined,
        status ? eq(meme.status, status) : undefined,
        isPublic !== undefined ? eq(meme.isPublic, isPublic) : undefined,
        generationType ? eq(meme.generationType, generationType) : undefined
      )
    );
  return result?.count || 0;
}

export async function getMemes({
  userId,
  status,
  isPublic,
  generationType,
  page = 1,
  limit = 30,
  orderBy = 'latest',
  getUser = false,
  currentUserId,
}: {
  userId?: string;
  status?: string;
  isPublic?: boolean;
  generationType?: string;
  page?: number;
  limit?: number;
  orderBy?: 'latest' | 'trending' | 'most_liked';
  getUser?: boolean;
  currentUserId?: string;
}): Promise<Meme[]> {
  let orderClause;
  switch (orderBy) {
    case 'trending':
      orderClause = [desc(meme.likeCount), desc(meme.createdAt)];
      break;
    case 'most_liked':
      orderClause = [desc(meme.likeCount)];
      break;
    default:
      orderClause = [desc(meme.createdAt)];
  }

  const result = await db()
    .select()
    .from(meme)
    .where(
      and(
        userId ? eq(meme.userId, userId) : undefined,
        status ? eq(meme.status, status) : undefined,
        isPublic !== undefined ? eq(meme.isPublic, isPublic) : undefined,
        generationType ? eq(meme.generationType, generationType) : undefined
      )
    )
    .orderBy(...orderClause)
    .limit(limit)
    .offset((page - 1) * limit);

  let memes = result as Meme[];

  if (getUser) {
    memes = await appendUserToResult(memes);
  }

  if (currentUserId && memes.length > 0) {
    memes = await appendLikeAndFavoriteStatus(memes, currentUserId);
  }

  return memes;
}

export async function incrementMemeViewCount(id: string): Promise<void> {
  await db()
    .update(meme)
    .set({ viewCount: sql`${meme.viewCount} + 1` })
    .where(eq(meme.id, id));
}

export async function incrementMemeShareCount(id: string): Promise<void> {
  await db()
    .update(meme)
    .set({ shareCount: sql`${meme.shareCount} + 1` })
    .where(eq(meme.id, id));
}

// Like functions
export async function likeMeme(
  userId: string,
  memeId: string,
  likeId: string
): Promise<boolean> {
  try {
    await db().transaction(async (tx) => {
      await tx.insert(memeLike).values({ id: likeId, userId, memeId });
      await tx
        .update(meme)
        .set({ likeCount: sql`${meme.likeCount} + 1` })
        .where(eq(meme.id, memeId));
    });
    return true;
  } catch {
    return false;
  }
}

export async function unlikeMeme(
  userId: string,
  memeId: string
): Promise<boolean> {
  try {
    await db().transaction(async (tx) => {
      await tx
        .delete(memeLike)
        .where(
          and(eq(memeLike.userId, userId), eq(memeLike.memeId, memeId))
        );
      await tx
        .update(meme)
        .set({ likeCount: sql`${meme.likeCount} - 1` })
        .where(eq(meme.id, memeId));
    });
    return true;
  } catch {
    return false;
  }
}

export async function isMemeLikedByUser(
  userId: string,
  memeId: string
): Promise<boolean> {
  const [result] = await db()
    .select()
    .from(memeLike)
    .where(and(eq(memeLike.userId, userId), eq(memeLike.memeId, memeId)));
  return !!result;
}

// Favorite functions
export async function favoriteMeme(
  userId: string,
  memeId: string,
  favoriteId: string
): Promise<boolean> {
  try {
    await db()
      .insert(memeFavorite)
      .values({ id: favoriteId, userId, memeId });
    return true;
  } catch {
    return false;
  }
}

export async function unfavoriteMeme(
  userId: string,
  memeId: string
): Promise<boolean> {
  try {
    await db()
      .delete(memeFavorite)
      .where(
        and(eq(memeFavorite.userId, userId), eq(memeFavorite.memeId, memeId))
      );
    return true;
  } catch {
    return false;
  }
}

export async function isMemeFavoritedByUser(
  userId: string,
  memeId: string
): Promise<boolean> {
  const [result] = await db()
    .select()
    .from(memeFavorite)
    .where(
      and(eq(memeFavorite.userId, userId), eq(memeFavorite.memeId, memeId))
    );
  return !!result;
}

export async function getUserFavorites({
  userId,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<Meme[]> {
  const favorites = await db()
    .select({ memeId: memeFavorite.memeId })
    .from(memeFavorite)
    .where(eq(memeFavorite.userId, userId))
    .orderBy(desc(memeFavorite.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (favorites.length === 0) return [];

  const memeIds = favorites.map((f) => f.memeId);
  const result = await db()
    .select()
    .from(meme)
    .where(
      and(
        sql`${meme.id} IN ${memeIds}`,
        eq(meme.status, MemeStatus.ACTIVE)
      )
    );

  let memes = result as Meme[];

  if (getUser) {
    memes = await appendUserToResult(memes);
  }

  memes = await appendLikeAndFavoriteStatus(memes, userId);

  return memes;
}

async function appendLikeAndFavoriteStatus(
  memes: Meme[],
  userId: string
): Promise<Meme[]> {
  const memeIds = memes.map((m) => m.id);

  const likes = await db()
    .select({ memeId: memeLike.memeId })
    .from(memeLike)
    .where(
      and(
        eq(memeLike.userId, userId),
        sql`${memeLike.memeId} IN ${memeIds}`
      )
    );

  const favorites = await db()
    .select({ memeId: memeFavorite.memeId })
    .from(memeFavorite)
    .where(
      and(
        eq(memeFavorite.userId, userId),
        sql`${memeFavorite.memeId} IN ${memeIds}`
      )
    );

  const likedMemeIds = new Set(likes.map((l) => l.memeId));
  const favoritedMemeIds = new Set(favorites.map((f) => f.memeId));

  return memes.map((m) => ({
    ...m,
    isLiked: likedMemeIds.has(m.id),
    isFavorited: favoritedMemeIds.has(m.id),
  }));
}
