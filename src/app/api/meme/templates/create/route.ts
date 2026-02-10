import { getUniSeq, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createMemeTemplate,
  findMemeTemplateBySlug,
  MemeTemplateSource,
  MemeTemplateStatus,
  TextArea,
} from '@/shared/models/meme_template';
import { getUserInfo } from '@/shared/models/user';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildDefaultTextAreas(): TextArea[] {
  return [
    { x: 5, y: 6, width: 90, height: 20, defaultText: '' },
    { x: 5, y: 74, width: 90, height: 20, defaultText: '' },
  ];
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 5; i += 1) {
    const exists = await findMemeTemplateBySlug(slug);
    if (!exists) return slug;
    slug = `${base}-${getUniSeq('')}`;
  }
  return `${base}-${getUniSeq('')}`;
}

export async function POST(request: Request) {
  try {
    const { imageUrl, name, textAreas, source } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('imageUrl is required');
    }

    const user = await getUserInfo();

    const sourceValue = Object.values(MemeTemplateSource).includes(source)
      ? source
      : user
        ? MemeTemplateSource.USER
        : MemeTemplateSource.AI;

    const templateName =
      (typeof name === 'string' && name.trim()) ||
      (sourceValue === MemeTemplateSource.AI
        ? 'AI Meme Template'
        : 'Custom Meme Template');

    const baseSlug = slugify(templateName) || 'meme';
    const prefix =
      sourceValue === MemeTemplateSource.AI
        ? 'ai'
        : sourceValue === MemeTemplateSource.USER
          ? 'u'
          : 'm';
    const slug = await generateUniqueSlug(`${prefix}-${baseSlug}`);

    const normalizedTextAreas =
      Array.isArray(textAreas) && textAreas.length > 0
        ? textAreas
        : buildDefaultTextAreas();

    const newTemplate = await createMemeTemplate({
      id: getUuid(),
      userId: user?.id ?? null,
      slug,
      name: templateName,
      imageUrl,
      thumbnailUrl: null,
      textAreas: JSON.stringify(normalizedTextAreas),
      source: sourceValue,
      status: MemeTemplateStatus.ACTIVE,
    });

    return respData({
      id: newTemplate.id,
      slug: newTemplate.slug,
      name: newTemplate.name,
      imageUrl: newTemplate.imageUrl,
      thumbnailUrl: newTemplate.thumbnailUrl,
      textAreas: normalizedTextAreas,
      source: newTemplate.source,
    });
  } catch (e: any) {
    console.error('create meme template failed', e);
    return respErr(e.message);
  }
}
