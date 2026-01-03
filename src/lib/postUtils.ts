import type { PostResponse } from './http';

export const resolveAuthorId = (post?: Pick<PostResponse, 'authorId'> | null) => {
  if (!post?.authorId) return '';
  if (typeof post.authorId === 'string') return post.authorId;
  if (post.authorId && typeof post.authorId === 'object' && '_id' in post.authorId) {
    return String(post.authorId._id ?? '');
  }
  return '';
};
