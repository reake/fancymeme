import { respData, respErr } from '@/shared/lib/resp';
import { findMemeTemplateBySlug } from '@/shared/models/meme_template';

function parseTextAreas(textAreas: string | null) {
  if (!textAreas) return [];
  try {
    return JSON.parse(textAreas);
  } catch {
    return [];
  }
}

function toDefaultTextBoxes(textAreas: any[]) {
  return textAreas.map((area) => ({
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    text: area.defaultText ?? '',
    fontSize: area.fontSize,
    fontColor: area.fontColor,
    fontFamily: area.fontFamily,
    textAlign: area.textAlign,
    strokeColor: area.strokeColor,
    strokeWidth: area.strokeWidth,
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const template = await findMemeTemplateBySlug(slug);

    if (!template) {
      throw new Error('template not found');
    }

    const textAreas = parseTextAreas(template.textAreas || null);
    const defaultTextBoxes = toDefaultTextBoxes(textAreas);

    return respData({
      id: template.id,
      slug: template.slug,
      name: template.name,
      imageUrl: template.imageUrl,
      thumbnailUrl: template.thumbnailUrl,
      textAreas,
      defaultTextBoxes,
      source: template.source,
    });
  } catch (e: any) {
    console.error('get meme template failed', e);
    return respErr(e.message);
  }
}
