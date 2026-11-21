import {
  DraftItem,
  PAGE_BREAK_MARKER,
  ReaderTheme,
} from '../types';

const KEYS = {
  DRAFTS: 'aynora_drafts_v1',
  ADMIN_SESSION: 'aynora_admin_session_v1',
  READER_THEME: 'aynora_reader_theme_v1',
  USER_LIKES: 'aynora_user_likes_v1',
  USER_EP_RATINGS: 'aynora_user_ep_ratings_v1',
  READ_NOTIFS: 'aynora_read_notifs_v1',
} as const;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Unable to persist to localStorage:', err);
  }
}

export function loadDrafts(): DraftItem[] {
  return safeRead<DraftItem[]>(KEYS.DRAFTS, []);
}

export function saveDrafts(drafts: DraftItem[]): void {
  safeWrite(KEYS.DRAFTS, drafts);
}

export function loadAdminSession(): boolean {
  return safeRead<boolean>(KEYS.ADMIN_SESSION, false);
}

export function saveAdminSession(isAdmin: boolean): void {
  safeWrite(KEYS.ADMIN_SESSION, isAdmin);
}

export function loadReaderTheme(): ReaderTheme {
  return safeRead<ReaderTheme>(KEYS.READER_THEME, 'glass');
}

export function saveReaderTheme(theme: ReaderTheme): void {
  safeWrite(KEYS.READER_THEME, theme);
}

export function loadUserLikes(): Record<string, boolean> {
  return safeRead<Record<string, boolean>>(KEYS.USER_LIKES, {});
}

export function saveUserLikes(likes: Record<string, boolean>): void {
  safeWrite(KEYS.USER_LIKES, likes);
}

export function loadUserEpisodeRatings(): Record<string, number> {
  return safeRead<Record<string, number>>(KEYS.USER_EP_RATINGS, {});
}

export function saveUserEpisodeRatings(ratings: Record<string, number>): void {
  safeWrite(KEYS.USER_EP_RATINGS, ratings);
}

export function loadReadNotifIds(): string[] {
  return safeRead<string[]>(KEYS.READ_NOTIFS, []);
}

export function saveReadNotifIds(ids: string[]): void {
  safeWrite(KEYS.READ_NOTIFS, ids);
}

export function splitPages(rawContent: string): string[] {
  const parts = rawContent
    .split(PAGE_BREAK_MARKER)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : [''];
}

export function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function drawCroppedCanvas(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = img.width / img.height;
        let sx = 0;
        let sy = 0;
        let sWidth = img.width;
        let sHeight = img.height;

        if (sourceRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetRatio;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(
          img,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );
        resolve(canvas);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Center-crops and compresses an uploaded image to an exact aspect ratio JPEG Blob
 * for uploading to Supabase Storage.
 */
export async function processImageToBlob(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<Blob> {
  const canvas = await drawCroppedCanvas(file, targetWidth, targetHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode JPEG blob'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.86,
    );
  });
}

export async function processImageFile(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<string> {
  const canvas = await drawCroppedCanvas(file, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.84);
}
