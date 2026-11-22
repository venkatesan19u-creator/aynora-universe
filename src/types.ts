export type WorkType = 'novel' | 'story' | 'poetry';

export type TabType = 'home' | 'novel' | 'story' | 'poetry' | 'write';

export type ReaderTheme = 'glass' | 'paper';

export const PAGE_BREAK_MARKER = '--- PAGE BREAK ---';

export const NOVEL_CATEGORIES = [
  'Romance',
  'Horror',
  'Fantasy',
  'Family Drama',
  'Revenge',
  'Tragedy',
  'Comedy',
  'Supernatural',
  'Magic Fantasy',
] as const;

export const STORY_CATEGORIES = [
  'Love stories',
  'Fantasy stories',
  'Horror stories',
  'Life stories',
  'Inspirational stories',
] as const;

export const POETRY_CATEGORIES = [
  'Love Poems',
  'Emotional Poems',
  'Nature Poems',
  'Life Poems',
] as const;

export const CATEGORIES_BY_TYPE: Record<WorkType, readonly string[]> = {
  novel: NOVEL_CATEGORIES,
  story: STORY_CATEGORIES,
  poetry: POETRY_CATEGORIES,
};

export interface Episode {
  id: string;
  workId?: string;
  episodeNumber: number;
  title: string;
  pages: string[];
  rawContent: string;
  likes: number;
  ratingSum: number;
  ratingCount: number;
  publishedAt: string;
}

export interface CommentItem {
  id: string;
  workId?: string;
  episodeNumber: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface WorkStats {
  views: number;
  likes: number;
  commentsCount: number;
  shares: number;
  ratingSum: number;
  ratingCount: number;
}

export interface WorkItem {
  id: string;
  type: WorkType;
  category: string;
  title: string;
  description: string;
  coverUrl: string;
  writerName: string;
  episodes: Episode[];
  stats: WorkStats;
  comments: CommentItem[];
  userLiked?: boolean;
  userEpisodeLikes?: Record<string, boolean>;
  userEpisodeRatings?: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

export interface DraftItem {
  id: string;
  type: WorkType;
  category: string;
  title: string;
  description: string;
  coverUrl: string;
  rawContent: string;
  episodeNumber: number;
  targetWorkId?: string;
  editingEpisodeId?: string;
  updatedAt: string;
}

export interface WriterProfile {
  name: string;
  photoUrl: string;
  ownershipLabel: string;
  bio: string;
}

export interface NotificationItem {
  id: string;
  workId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
