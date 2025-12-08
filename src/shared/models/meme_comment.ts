import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { meme, memeComment } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export type MemeComment = typeof memeComment.$inferSelect & {
  user?: User;
  replies?: MemeComment[];
};
export type NewMemeComment = typeof memeComment.$inferInsert;
export type UpdateMemeComment = Partial<
  Omit<NewMemeComment, 'id' | 'createdAt' | 'userId' | 'memeId'>
>;

export enum MemeCommentStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export async function createMemeComment(
  newComment: NewMemeComment
): Promise<MemeComment> {
  const [result] = await db().transaction(async (tx) => {
    const [comment] = await tx
      .insert(memeComment)
      .values(newComment)
      .returning();

    await tx
      .update(meme)
      .set({ commentCount: sql`${meme.commentCount} + 1` })
      .where(eq(meme.id, newComment.memeId));

    return [comment];
  });

  return result;
}

export async function findMemeCommentById(
  id: string
): Promise<MemeComment | undefined> {
  const [result] = await db()
    .select()
    .from(memeComment)
    .where(eq(memeComment.id, id));
  return result;
}

export async function updateMemeCommentById(
  id: string,
  updateData: UpdateMemeComment
): Promise<MemeComment | undefined> {
  const [result] = await db()
    .update(memeComment)
    .set(updateData)
    .where(eq(memeComment.id, id))
    .returning();
  return result;
}

export async function deleteMemeCommentById(
  id: string,
  memeId: string
): Promise<void> {
  await db().transaction(async (tx) => {
    await tx
      .update(memeComment)
      .set({ status: MemeCommentStatus.DELETED, deletedAt: new Date() })
      .where(eq(memeComment.id, id));

    await tx
      .update(meme)
      .set({ commentCount: sql`${meme.commentCount} - 1` })
      .where(eq(meme.id, memeId));
  });
}

export async function getMemeCommentsCount({
  memeId,
  userId,
  status,
}: {
  memeId?: string;
  userId?: string;
  status?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(memeComment)
    .where(
      and(
        memeId ? eq(memeComment.memeId, memeId) : undefined,
        userId ? eq(memeComment.userId, userId) : undefined,
        status ? eq(memeComment.status, status) : undefined
      )
    );
  return result?.count || 0;
}

export async function getMemeComments({
  memeId,
  status = MemeCommentStatus.ACTIVE,
  page = 1,
  limit = 30,
  getUser = true,
  includeReplies = true,
}: {
  memeId: string;
  status?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
  includeReplies?: boolean;
}): Promise<MemeComment[]> {
  // Get top-level comments
  const result = await db()
    .select()
    .from(memeComment)
    .where(
      and(
        eq(memeComment.memeId, memeId),
        eq(memeComment.status, status),
        isNull(memeComment.parentId)
      )
    )
    .orderBy(desc(memeComment.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  let comments = result as MemeComment[];

  if (getUser) {
    comments = await appendUserToResult(comments);
  }

  if (includeReplies && comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const replies = await db()
      .select()
      .from(memeComment)
      .where(
        and(
          eq(memeComment.status, status),
          sql`${memeComment.parentId} IN ${commentIds}`
        )
      )
      .orderBy(memeComment.createdAt);

    let repliesWithUser = replies as MemeComment[];
    if (getUser) {
      repliesWithUser = await appendUserToResult(repliesWithUser);
    }

    const repliesMap = new Map<string, MemeComment[]>();
    for (const reply of repliesWithUser) {
      if (reply.parentId) {
        const existing = repliesMap.get(reply.parentId) || [];
        existing.push(reply);
        repliesMap.set(reply.parentId, existing);
      }
    }

    comments = comments.map((comment) => ({
      ...comment,
      replies: repliesMap.get(comment.id) || [],
    }));
  }

  return comments;
}

export async function incrementCommentLikeCount(id: string): Promise<void> {
  await db()
    .update(memeComment)
    .set({ likeCount: sql`${memeComment.likeCount} + 1` })
    .where(eq(memeComment.id, id));
}

export async function decrementCommentLikeCount(id: string): Promise<void> {
  await db()
    .update(memeComment)
    .set({ likeCount: sql`${memeComment.likeCount} - 1` })
    .where(eq(memeComment.id, id));
}
