import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createMemeComment,
  deleteMemeCommentById,
  findMemeCommentById,
  getMemeComments,
  MemeCommentStatus,
  NewMemeComment,
} from '@/shared/models/meme_comment';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memeId = searchParams.get('memeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!memeId) {
      throw new Error('memeId is required');
    }

    const comments = await getMemeComments({
      memeId,
      page,
      limit,
      getUser: true,
      includeReplies: true,
    });

    return respData({ items: comments, page, limit });
  } catch (e: any) {
    console.error('get comments failed', e);
    return respErr(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const { memeId, content, parentId } = await request.json();

    if (!memeId || !content) {
      throw new Error('memeId and content are required');
    }

    if (content.length > 1000) {
      throw new Error('comment too long');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const newComment: NewMemeComment = {
      id: getUuid(),
      userId: user.id,
      memeId,
      parentId: parentId || null,
      content: content.trim(),
      status: MemeCommentStatus.ACTIVE,
    };

    const comment = await createMemeComment(newComment);

    return respData(comment);
  } catch (e: any) {
    console.error('create comment failed', e);
    return respErr(e.message);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      throw new Error('comment id is required');
    }

    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    const comment = await findMemeCommentById(commentId);
    if (!comment) {
      throw new Error('comment not found');
    }

    if (comment.userId !== user.id) {
      throw new Error('no permission');
    }

    await deleteMemeCommentById(commentId, comment.memeId);

    return respData({ success: true });
  } catch (e: any) {
    console.error('delete comment failed', e);
    return respErr(e.message);
  }
}
