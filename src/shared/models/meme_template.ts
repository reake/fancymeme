import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { memeTemplate } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export type MemeTemplate = typeof memeTemplate.$inferSelect & {
  user?: User;
};
export type NewMemeTemplate = typeof memeTemplate.$inferInsert;
export type UpdateMemeTemplate = Partial<
  Omit<NewMemeTemplate, 'id' | 'createdAt' | 'userId'>
>;

export enum MemeTemplateStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  DELETED = 'deleted',
}

export enum MemeTemplateSource {
  SYSTEM = 'system',
  USER = 'user',
  AI = 'ai',
}

export interface TextArea {
  x: number;
  y: number;
  width: number;
  height: number;
  defaultText?: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  strokeColor?: string;
  strokeWidth?: number;
}

export async function createMemeTemplate(
  newTemplate: NewMemeTemplate
): Promise<MemeTemplate> {
  const [result] = await db()
    .insert(memeTemplate)
    .values(newTemplate)
    .returning();
  return result;
}

export async function findMemeTemplateById(
  id: string
): Promise<MemeTemplate | undefined> {
  const [result] = await db()
    .select()
    .from(memeTemplate)
    .where(eq(memeTemplate.id, id));
  return result;
}

export async function findMemeTemplateBySlug(
  slug: string
): Promise<MemeTemplate | undefined> {
  const [result] = await db()
    .select()
    .from(memeTemplate)
    .where(eq(memeTemplate.slug, slug));
  return result;
}

export async function updateMemeTemplateById(
  id: string,
  updateData: UpdateMemeTemplate
): Promise<MemeTemplate | undefined> {
  const [result] = await db()
    .update(memeTemplate)
    .set(updateData)
    .where(eq(memeTemplate.id, id))
    .returning();
  return result;
}

export async function deleteMemeTemplateById(id: string): Promise<void> {
  await db()
    .update(memeTemplate)
    .set({ status: MemeTemplateStatus.DELETED, deletedAt: new Date() })
    .where(eq(memeTemplate.id, id));
}

export async function getMemeTemplatesCount({
  userId,
  status,
  category,
  source,
}: {
  userId?: string;
  status?: string;
  category?: string;
  source?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(memeTemplate)
    .where(
      and(
        userId ? eq(memeTemplate.userId, userId) : undefined,
        status ? eq(memeTemplate.status, status) : undefined,
        category ? eq(memeTemplate.category, category) : undefined,
        source ? eq(memeTemplate.source, source) : undefined
      )
    );
  return result?.count || 0;
}

export async function getMemeTemplates({
  userId,
  status,
  category,
  source,
  page = 1,
  limit = 30,
  orderBy = 'latest',
  getUser = false,
}: {
  userId?: string;
  status?: string;
  category?: string;
  source?: string;
  page?: number;
  limit?: number;
  orderBy?: 'latest' | 'popular';
  getUser?: boolean;
}): Promise<MemeTemplate[]> {
  const orderClause =
    orderBy === 'popular'
      ? [desc(memeTemplate.usageCount), desc(memeTemplate.createdAt)]
      : [desc(memeTemplate.createdAt)];

  const result = await db()
    .select()
    .from(memeTemplate)
    .where(
      and(
        userId ? eq(memeTemplate.userId, userId) : undefined,
        status ? eq(memeTemplate.status, status) : undefined,
        category ? eq(memeTemplate.category, category) : undefined,
        source ? eq(memeTemplate.source, source) : undefined
      )
    )
    .orderBy(...orderClause)
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function incrementTemplateUsageCount(id: string): Promise<void> {
  await db()
    .update(memeTemplate)
    .set({ usageCount: sql`${memeTemplate.usageCount} + 1` })
    .where(eq(memeTemplate.id, id));
}

export async function getTemplateCategories(): Promise<string[]> {
  const result = (await db()
    .selectDistinct({ category: memeTemplate.category })
    .from(memeTemplate)
    .where(eq(memeTemplate.status, MemeTemplateStatus.ACTIVE))) as Array<{
    category: string | null;
  }>;

  return result
    .map((r) => r.category)
    .filter((c): c is string => c !== null);
}
