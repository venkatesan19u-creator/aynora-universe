-- AYNORA UNIVERSE — Supabase Database, RLS & Storage Setup Script
-- Paste and run this entire script once in your Supabase SQL Editor.

-- 1. WORKS TABLE
CREATE TABLE IF NOT EXISTS public.works (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('novel', 'story', 'poetry')),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  writer_name TEXT NOT NULL DEFAULT 'அயனோரா (Aynora)',
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EPISODES TABLE
CREATE TABLE IF NOT EXISTS public.episodes (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  likes INTEGER NOT NULL DEFAULT 0,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_episodes_work_id ON public.episodes(work_id, episode_number);

-- 3. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL DEFAULT 1,
  reader_name TEXT NOT NULL DEFAULT 'Reader',
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_work_id ON public.comments(work_id, created_at DESC);

-- 4. APP SETTINGS TABLE (Admin PIN + Public Writer Profile)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  admin_pin TEXT NOT NULL DEFAULT '1234',
  writer_name TEXT NOT NULL DEFAULT 'அயனோரா (Aynora)',
  writer_photo_url TEXT NOT NULL DEFAULT '',
  website_title TEXT NOT NULL DEFAULT 'AYNORA UNIVERSE — Official Publication',
  bio TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ENABLE ROW LEVEL SECURITY & PUBLIC ACCESS POLICIES
-- (Admin editing is gated by the secret Admin PIN in the app UI)
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access works" ON public.works;
CREATE POLICY "Public access works" ON public.works
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access episodes" ON public.episodes;
CREATE POLICY "Public access episodes" ON public.episodes
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access comments" ON public.comments;
CREATE POLICY "Public access comments" ON public.comments
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access app_settings" ON public.app_settings;
CREATE POLICY "Public access app_settings" ON public.app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 6. ENABLE SUPABASE REALTIME FOR LIVE SYNC
ALTER PUBLICATION supabase_realtime ADD TABLE public.works;
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- 7. PUBLIC STORAGE BUCKET FOR 2:3 BOOK COVERS & PROFILE PHOTO
INSERT INTO storage.buckets (id, name, public)
VALUES ('aynora-media', 'aynora-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read aynora-media" ON storage.objects;
CREATE POLICY "Public read aynora-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'aynora-media');

DROP POLICY IF EXISTS "Public upload aynora-media" ON storage.objects;
CREATE POLICY "Public upload aynora-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'aynora-media');

DROP POLICY IF EXISTS "Public update aynora-media" ON storage.objects;
CREATE POLICY "Public update aynora-media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'aynora-media') WITH CHECK (bucket_id = 'aynora-media');

DROP POLICY IF EXISTS "Public delete aynora-media" ON storage.objects;
CREATE POLICY "Public delete aynora-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'aynora-media');
