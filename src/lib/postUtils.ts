import type { PostResponse } from './http';

type AuthorCandidate = Pick<PostResponse, 'authorId'> & { userId?: string | { _id?: string } };

export const resolveAuthorId = (post?: AuthorCandidate | null) => {
  if (post?.userId) {
    if (typeof post.userId === 'string') return post.userId;
    if (typeof post.userId === 'object' && '_id' in post.userId) {
      return String(post.userId._id ?? '');
    }
  }
  if (!post?.authorId) return '';
  if (typeof post.authorId === 'string') return post.authorId;
  if (post.authorId && typeof post.authorId === 'object' && '_id' in post.authorId) {
    return String(post.authorId._id ?? '');
  }
  return '';
};
