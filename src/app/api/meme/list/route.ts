import { respData, respErr } from '@/shared/lib/resp';
import { getMemes, getMemesCount, MemeStatus } from '@/shared/models/meme';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const orderBy = (searchParams.get('orderBy') || 'latest') as
      | 'latest'
      | 'trending'
      | 'most_liked';
    const userId = searchParams.get('userId') || undefined;
    const generationType = searchParams.get('generationType') || undefined;

    const user = await getUserInfo();

    const memes = await getMemes({
      status: MemeStatus.ACTIVE,
      isPublic: true,
      userId,
      generationType,
      page,
      limit,
      orderBy,
      getUser: true,
      currentUserId: user?.id,
    });

    const total = await getMemesCount({
      status: MemeStatus.ACTIVE,
      isPublic: true,
      userId,
      generationType,
    });

    return respData({
      items: memes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    console.error('get memes failed', e);
    return respErr(e.message);
  }
}
