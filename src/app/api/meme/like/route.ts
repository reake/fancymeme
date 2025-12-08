import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { likeMeme, unlikeMeme } from '@/shared/models/meme';
import { getUserInfo } from '@/shared/models/user';

export async function POST(request: Request) {
  try {
    const { memeId, action } = await request.json();

    if (!memeId) {
      throw new Error('memeId is required');
    }

    if (!action || !['like', 'unlike'].includes(action)) {
      throw new Error('invalid action');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    let success = false;

    if (action === 'like') {
      success = await likeMeme(user.id, memeId, getUuid());
    } else {
      success = await unlikeMeme(user.id, memeId);
    }

    if (!success) {
      throw new Error(`${action} failed`);
    }

    return respData({ success: true, action });
  } catch (e: any) {
    console.error('like/unlike meme failed', e);
    return respErr(e.message);
  }
}
