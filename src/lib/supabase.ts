import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_WRITER_PROFILE,
  INITIAL_WORKS,
} from '../data/seedData';
import {
  CommentItem,
  Episode,
  PAGE_BREAK_MARKER,
  WorkItem,
  WorkType,
  WriterProfile,
} from '../types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://cjoizqmkkxehpntbximk.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_jb5TeG39z-x0FISunrJ9sA_KnN1lhIu';

export const STORAGE_BUCKET = 'aynora-media';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isDatabaseReady = false;
let episodesHasLikesColumn: boolean | null = null;

interface DbWorkRow {
  id: string;
  title: string;
  type: WorkType;
  category: string;
  description: string;
  cover_url: string;
  writer_name: string;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  created_at: string;
}

interface DbEpisodeRow {
  id: string;
  work_id: string;
  episode_number: number;
  title: string;
  pages: string[];
  likes?: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
}

interface DbCommentRow {
  id: string;
  work_id: string;
  episode_number: number;
  reader_name: string;
  comment_text: string;
  created_at: string;
}

interface DbSettingsRow {
  id: string;
  admin_pin: string;
  writer_name: string;
  writer_photo_url: string;
  website_title: string;
  bio: string;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.toLowerCase().includes('does not exist')) ||
    Boolean(error.message?.toLowerCase().includes('schema cache'))
  );
}

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  columnName: string,
): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (msg.includes(columnName.toLowerCase()) &&
      (msg.includes('column') || msg.includes('schema cache')))
  );
}

export async function uploadMediaToBucket(
  blob: Blob,
  folder: 'covers' | 'avatars',
): Promise<string> {
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function seedInitialSupabaseData(): Promise<void> {
  const { error: settingsErr } = await supabase.from('app_settings').upsert(
    {
      id: 'default',
      admin_pin: DEFAULT_ADMIN_PIN,
      writer_name: DEFAULT_WRITER_PROFILE.name,
      writer_photo_url: DEFAULT_WRITER_PROFILE.photoUrl,
      website_title: DEFAULT_WRITER_PROFILE.ownershipLabel,
      bio: DEFAULT_WRITER_PROFILE.bio,
    },
    { onConflict: 'id' },
  );
  if (settingsErr) throw settingsErr;

  const workRows: DbWorkRow[] = INITIAL_WORKS.map((w) => ({
    id: w.id,
    title: w.title,
    type: w.type,
    category: w.category,
    description: w.description,
    cover_url: w.coverUrl,
    writer_name: w.writerName,
    views: w.stats.views,
    likes: w.stats.likes,
    comments_count: w.comments.length,
    shares: w.stats.shares,
    created_at: w.createdAt,
  }));

  const { error: worksErr } = await supabase
    .from('works')
    .upsert(workRows, { onConflict: 'id' });
  if (worksErr) throw worksErr;

  const episodeRows: DbEpisodeRow[] = INITIAL_WORKS.flatMap((w) =>
    w.episodes.map((ep) => ({
      id: ep.id,
      work_id: w.id,
      episode_number: ep.episodeNumber,
      title: ep.title,
      pages: ep.pages,
      likes: ep.likes,
      rating_sum: ep.ratingSum,
      rating_count: ep.ratingCount,
      created_at: ep.publishedAt,
    })),
  );

  const { error: epErr } = await supabase
    .from('episodes')
    .upsert(episodeRows, { onConflict: 'id' });
  if (epErr) {
    if (isMissingColumnError(epErr, 'likes')) {
      const legacyRows = episodeRows.map(({ likes: _likes, ...rest }) => rest);
      const { error: retryErr } = await supabase
        .from('episodes')
        .upsert(legacyRows, { onConflict: 'id' });
      if (retryErr) throw retryErr;
    } else {
      throw epErr;
    }
  }

  const commentRows: DbCommentRow[] = INITIAL_WORKS.flatMap((w) =>
    w.comments.map((c) => ({
      id: c.id,
      work_id: w.id,
      episode_number: c.episodeNumber,
      reader_name: c.author,
      comment_text: c.text,
      created_at: c.createdAt,
    })),
  );

  if (commentRows.length > 0) {
    const { error: cmtErr } = await supabase
      .from('comments')
      .upsert(commentRows, { onConflict: 'id' });
    if (cmtErr) throw cmtErr;
  }
}

export interface FetchPublicDataResult {
  status: 'connected' | 'missing_schema' | 'error';
  works: WorkItem[];
  writerProfile: WriterProfile;
  adminPin: string;
  errorMessage?: string;
}

export async function fetchAllPublicData(
  userLikes: Record<string, boolean>,
  userEpisodeRatings: Record<string, number>,
): Promise<FetchPublicDataResult> {
  const [worksRes, episodesRes, commentsRes, settingsRes] = await Promise.all([
    supabase
      .from('works')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: true }),
    supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('app_settings')
      .select('*')
      .in('id', ['default', 'episode_likes']),
  ]);

  const firstError =
    worksRes.error || episodesRes.error || commentsRes.error || settingsRes.error;

  if (firstError) {
    isDatabaseReady = false;
    if (isMissingTableError(firstError)) {
      return {
        status: 'missing_schema',
        works: INITIAL_WORKS,
        writerProfile: DEFAULT_WRITER_PROFILE,
        adminPin: DEFAULT_ADMIN_PIN,
        errorMessage: 'Supabase tables have not been created yet.',
      };
    }
    return {
      status: 'error',
      works: INITIAL_WORKS,
      writerProfile: DEFAULT_WRITER_PROFILE,
      adminPin: DEFAULT_ADMIN_PIN,
      errorMessage: firstError.message,
    };
  }

  const dbWorks = (worksRes.data ?? []) as DbWorkRow[];
  const settingsRows = (settingsRes.data ?? []) as DbSettingsRow[];
  const dbSettings =
    settingsRows.find((row) => row.id === 'default') ?? null;
  const epLikesRow =
    settingsRows.find((row) => row.id === 'episode_likes') ?? null;

  let fallbackEpisodeLikesMap: Record<string, number> = {};
  if (epLikesRow?.bio) {
    try {
      const parsed = JSON.parse(epLikesRow.bio) as unknown;
      if (parsed && typeof parsed === 'object') {
        fallbackEpisodeLikesMap = parsed as Record<string, number>;
      }
    } catch {
      fallbackEpisodeLikesMap = {};
    }
  }

  // Auto-seed initial Tamil sample content & profile on first empty database boot
  if (dbWorks.length === 0 && !dbSettings) {
    try {
      await seedInitialSupabaseData();
      return fetchAllPublicData(userLikes, userEpisodeRatings);
    } catch (seedErr) {
      isDatabaseReady = false;
      return {
        status: 'error',
        works: INITIAL_WORKS,
        writerProfile: DEFAULT_WRITER_PROFILE,
        adminPin: DEFAULT_ADMIN_PIN,
        errorMessage:
          seedErr instanceof Error ? seedErr.message : 'Failed to seed initial data',
      };
    }
  }

  isDatabaseReady = true;
  const dbEpisodes = (episodesRes.data ?? []) as DbEpisodeRow[];
  const dbComments = (commentsRes.data ?? []) as DbCommentRow[];
  if (dbEpisodes.length > 0) {
    episodesHasLikesColumn = Object.prototype.hasOwnProperty.call(
      dbEpisodes[0],
      'likes',
    );
  }

  const writerProfile: WriterProfile = dbSettings
    ? {
        name: dbSettings.writer_name || DEFAULT_WRITER_PROFILE.name,
        photoUrl:
          dbSettings.writer_photo_url || DEFAULT_WRITER_PROFILE.photoUrl,
        ownershipLabel:
          dbSettings.website_title || DEFAULT_WRITER_PROFILE.ownershipLabel,
        bio: dbSettings.bio || DEFAULT_WRITER_PROFILE.bio,
      }
    : DEFAULT_WRITER_PROFILE;

  const adminPin = dbSettings?.admin_pin || DEFAULT_ADMIN_PIN;

  const works: WorkItem[] = dbWorks.map((w) => {
    const workEpisodes: Episode[] = dbEpisodes
      .filter((ep) => ep.work_id === w.id)
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((ep) => {
        const pagesArray = Array.isArray(ep.pages) ? ep.pages : [];
        return {
          id: ep.id,
          workId: ep.work_id,
          episodeNumber: ep.episode_number,
          title: ep.title,
          pages: pagesArray.length > 0 ? pagesArray : [''],
          rawContent: pagesArray.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
          likes:
            typeof ep.likes === 'number'
              ? ep.likes
              : (fallbackEpisodeLikesMap[ep.id] ?? 0),
          ratingSum: ep.rating_sum ?? 0,
          ratingCount: ep.rating_count ?? 0,
          publishedAt: ep.created_at,
        };
      });

    const workComments: CommentItem[] = dbComments
      .filter((c) => c.work_id === w.id)
      .map((c) => ({
        id: c.id,
        workId: c.work_id,
        episodeNumber: c.episode_number ?? 1,
        author: c.reader_name,
        text: c.comment_text,
        createdAt: c.created_at,
      }));

    const episodeLikesSum = workEpisodes.reduce((acc, ep) => acc + ep.likes, 0);
    const totalLikes = episodeLikesSum > 0 ? episodeLikesSum : (w.likes ?? 0);
    const ratingSum = workEpisodes.reduce((acc, ep) => acc + ep.ratingSum, 0);
    const ratingCount = workEpisodes.reduce((acc, ep) => acc + ep.ratingCount, 0);

    const epLikeMap: Record<string, boolean> = {};
    const epRatingMap: Record<number, number> = {};
    workEpisodes.forEach((ep) => {
      if (userLikes[ep.id]) {
        epLikeMap[ep.id] = true;
      }
      const key = `${w.id}:${ep.episodeNumber}`;
      if (userEpisodeRatings[key]) {
        epRatingMap[ep.episodeNumber] = userEpisodeRatings[key];
      }
    });

    const anyEpisodeLiked = workEpisodes.some((ep) => Boolean(epLikeMap[ep.id]));

    return {
      id: w.id,
      type: w.type,
      category: w.category,
      title: w.title,
      description: w.description,
      coverUrl: w.cover_url,
      writerName: w.writer_name || writerProfile.name,
      episodes: workEpisodes,
      stats: {
        views: w.views ?? 0,
        likes: totalLikes,
        commentsCount: Math.max(w.comments_count ?? 0, workComments.length),
        shares: w.shares ?? 0,
        ratingSum,
        ratingCount,
      },
      comments: workComments,
      userLiked: anyEpisodeLiked,
      userEpisodeLikes: epLikeMap,
      userEpisodeRatings: epRatingMap,
      createdAt: w.created_at,
      updatedAt:
        workEpisodes[workEpisodes.length - 1]?.publishedAt || w.created_at,
    };
  });

  return {
    status: 'connected',
    works,
    writerProfile,
    adminPin,
  };
}

export interface DbMutationResult {
  ok: boolean;
  error?: string;
}

export async function incrementWorkViewsInDb(
  workId: string,
  nextViews: number,
): Promise<DbMutationResult> {
  if (!isDatabaseReady) {
    return { ok: false };
  }
  const { error } = await supabase
    .from('works')
    .update({ views: nextViews })
    .eq('id', workId);
  if (error) {
    console.warn('Skipped views update:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateEpisodeLikesInDb(
  episodeId: string,
  nextEpisodeLikes: number,
  workId: string,
  nextWorkTotalLikes: number,
  allEpisodeLikesMap: Record<string, number>,
): Promise<DbMutationResult> {
  if (!isDatabaseReady) {
    return { ok: false, error: 'Database is not connected yet.' };
  }

  if (episodesHasLikesColumn !== false) {
    const { data: epData, error: epError } = await supabase
      .from('episodes')
      .update({ likes: nextEpisodeLikes })
      .eq('id', episodeId)
      .select('id');

    if (!epError && epData && epData.length > 0) {
      episodesHasLikesColumn = true;
      const { error: workError } = await supabase
        .from('works')
        .update({ likes: nextWorkTotalLikes })
        .eq('id', workId);
      if (workError) {
        return { ok: false, error: workError.message };
      }
      return { ok: true };
    }

    if (epError && isMissingColumnError(epError, 'likes')) {
      episodesHasLikesColumn = false;
    } else if (epError) {
      return { ok: false, error: epError.message };
    } else if (!epData || epData.length === 0) {
      return { ok: false, error: 'Episode record not found in database.' };
    }
  }

  // Seamless fallback when episodes.likes column hasn't been migrated in SQL yet:
  // store per-episode likes JSON in app_settings ('episode_likes') + total on works.likes
  const { error: mapError } = await supabase.from('app_settings').upsert(
    {
      id: 'episode_likes',
      bio: JSON.stringify(allEpisodeLikesMap),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (mapError) {
    return { ok: false, error: mapError.message };
  }

  const { error: workError } = await supabase
    .from('works')
    .update({ likes: nextWorkTotalLikes })
    .eq('id', workId);

  if (workError) {
    return { ok: false, error: workError.message };
  }

  return { ok: true };
}

export async function incrementWorkSharesInDb(
  workId: string,
  nextShares: number,
): Promise<DbMutationResult> {
  if (!isDatabaseReady) {
    return { ok: false };
  }
  const { error } = await supabase
    .from('works')
    .update({ shares: nextShares })
    .eq('id', workId);
  if (error) {
    console.warn('Skipped shares update:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateEpisodeRatingInDb(
  episodeId: string,
  ratingSum: number,
  ratingCount: number,
): Promise<DbMutationResult> {
  if (!isDatabaseReady) {
    return { ok: false, error: 'Database is not connected yet.' };
  }
  const { data, error } = await supabase
    .from('episodes')
    .update({ rating_sum: ratingSum, rating_count: ratingCount })
    .eq('id', episodeId)
    .select('id');
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Episode record not found in database.' };
  }
  return { ok: true };
}

export async function insertCommentAndSyncCountInDb(
  comment: CommentItem,
  nextCommentsCount: number,
): Promise<DbMutationResult> {
  const { error } = await supabase.from('comments').insert({
    id: comment.id,
    work_id: comment.workId,
    episode_number: comment.episodeNumber,
    reader_name: comment.author,
    comment_text: comment.text,
    created_at: comment.createdAt,
  });
  if (error) {
    console.error('Failed to insert comment:', error.message);
    return { ok: false, error: error.message };
  }
  if (comment.workId) {
    const { error: countErr } = await supabase
      .from('works')
      .update({ comments_count: nextCommentsCount })
      .eq('id', comment.workId);
    if (countErr) {
      console.error('Failed to update comments_count:', countErr.message);
      return { ok: false, error: countErr.message };
    }
  }
  return { ok: true };
}

export async function publishNewWorkToDb(work: WorkItem): Promise<void> {
  const { error: workErr } = await supabase.from('works').insert({
    id: work.id,
    title: work.title,
    type: work.type,
    category: work.category,
    description: work.description,
    cover_url: work.coverUrl,
    writer_name: work.writerName,
    views: work.stats.views,
    likes: work.stats.likes,
    comments_count: 0,
    shares: work.stats.shares,
    created_at: work.createdAt,
  });
  if (workErr) throw workErr;

  const ep = work.episodes[0];
  if (ep) {
    const { error: epErr } = await supabase.from('episodes').insert({
      id: ep.id,
      work_id: work.id,
      episode_number: ep.episodeNumber,
      title: ep.title,
      pages: ep.pages,
      likes: 0,
      rating_sum: 0,
      rating_count: 0,
      created_at: ep.publishedAt,
    });
    if (epErr) {
      if (isMissingColumnError(epErr, 'likes')) {
        const { error: retryErr } = await supabase.from('episodes').insert({
          id: ep.id,
          work_id: work.id,
          episode_number: ep.episodeNumber,
          title: ep.title,
          pages: ep.pages,
          rating_sum: 0,
          rating_count: 0,
          created_at: ep.publishedAt,
        });
        if (retryErr) throw retryErr;
      } else {
        throw epErr;
      }
    }
  }
}

export async function addEpisodeToWorkInDb(
  workId: string,
  coverUrl: string,
  description: string,
  episode: Episode,
): Promise<void> {
  const { error: workErr } = await supabase
    .from('works')
    .update({ cover_url: coverUrl, description })
    .eq('id', workId);
  if (workErr) throw workErr;

  const { error: epErr } = await supabase.from('episodes').insert({
    id: episode.id,
    work_id: workId,
    episode_number: episode.episodeNumber,
    title: episode.title,
    pages: episode.pages,
    likes: 0,
    rating_sum: 0,
    rating_count: 0,
    created_at: episode.publishedAt,
  });
  if (epErr) {
    if (isMissingColumnError(epErr, 'likes')) {
      const { error: retryErr } = await supabase.from('episodes').insert({
        id: episode.id,
        work_id: workId,
        episode_number: episode.episodeNumber,
        title: episode.title,
        pages: episode.pages,
        rating_sum: 0,
        rating_count: 0,
        created_at: episode.publishedAt,
      });
      if (retryErr) throw retryErr;
    } else {
      throw epErr;
    }
  }
}

export async function updateWorkAndEpisodeInDb(payload: {
  workId: string;
  title: string;
  coverUrl: string;
  description: string;
  episodeId: string;
  episodeTitle: string;
  pages: string[];
}): Promise<void> {
  const { error: workErr } = await supabase
    .from('works')
    .update({
      title: payload.title,
      cover_url: payload.coverUrl,
      description: payload.description,
    })
    .eq('id', payload.workId);
  if (workErr) throw workErr;

  const { error: epErr } = await supabase
    .from('episodes')
    .update({
      title: payload.episodeTitle,
      pages: payload.pages,
    })
    .eq('id', payload.episodeId);
  if (epErr) throw epErr;
}

export async function deleteWorkFromDb(workId: string): Promise<void> {
  const { error } = await supabase.from('works').delete().eq('id', workId);
  if (error) throw error;
}

export async function updateWriterProfileInDb(
  profile: WriterProfile,
): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert(
    {
      id: 'default',
      writer_name: profile.name,
      writer_photo_url: profile.photoUrl,
      website_title: profile.ownershipLabel,
      bio: profile.bio,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;

  // Keep works.writer_name aligned with the latest official Writer Profile name
  await supabase
    .from('works')
    .update({ writer_name: profile.name })
    .neq('writer_name', profile.name);
}

export async function updateAdminPinInDb(newPin: string): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert(
    {
      id: 'default',
      admin_pin: newPin,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export function subscribeToAynoraChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('aynora-universe-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'works' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'episodes' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings' },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
