import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createMeme,
  MemeGenerationType,
  MemeStatus,
  NewMeme,
} from '@/shared/models/meme';
import { getUserInfo } from '@/shared/models/user';

export async function POST(request: Request) {
  try {
    const {
      templateId,
      title,
      imageUrl,
      thumbnailUrl,
      prompt,
      textContent,
      generationType,
      aiTaskId,
      isPublic = true,
    } = await request.json();

    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    if (
      !generationType ||
      !Object.values(MemeGenerationType).includes(generationType)
    ) {
      throw new Error('invalid generationType');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const newMeme: NewMeme = {
      id: getUuid(),
      userId: user.id,
      templateId: templateId || null,
      title: title || null,
      imageUrl,
      thumbnailUrl: thumbnailUrl || null,
      prompt: prompt || null,
      textContent: textContent ? JSON.stringify(textContent) : null,
      generationType,
      aiTaskId: aiTaskId || null,
      isPublic,
      status: MemeStatus.ACTIVE,
    };

    const meme = await createMeme(newMeme);

    return respData(meme);
  } catch (e: any) {
    console.error('create meme failed', e);
    return respErr(e.message);
  }
}
