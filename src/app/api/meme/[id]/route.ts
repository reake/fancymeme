import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteMemeById,
  findMemeById,
  incrementMemeViewCount,
  updateMemeById,
} from '@/shared/models/meme';
import { getUserInfo } from '@/shared/models/user';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meme = await findMemeById(id);
    if (!meme) {
      throw new Error('meme not found');
    }

    // Increment view count
    await incrementMemeViewCount(id);

    return respData(meme);
  } catch (e: any) {
    console.error('get meme failed', e);
    return respErr(e.message);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, isPublic } = await request.json();

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const meme = await findMemeById(id);
    if (!meme) {
      throw new Error('meme not found');
    }

    if (meme.userId !== user.id) {
      throw new Error('no permission');
    }

    const updated = await updateMemeById(id, {
      title,
      isPublic,
    });

    return respData(updated);
  } catch (e: any) {
    console.error('update meme failed', e);
    return respErr(e.message);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const meme = await findMemeById(id);
    if (!meme) {
      throw new Error('meme not found');
    }

    if (meme.userId !== user.id) {
      throw new Error('no permission');
    }

    await deleteMemeById(id);

    return respData({ success: true });
  } catch (e: any) {
    console.error('delete meme failed', e);
    return respErr(e.message);
  }
}
