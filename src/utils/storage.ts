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

export interface PageRange {
  index: number;
  start: number;
  end: number;
  text: string;
}

export function getPageRanges(rawContent: string): PageRange[] {
  if (!rawContent) {
    return [{ index: 0, start: 0, end: 0, text: '' }];
  }

  const ranges: PageRange[] = [];
  let searchFrom = 0;
  let pageIdx = 0;

  while (searchFrom <= rawContent.length) {
    const markerIdx = rawContent.indexOf(PAGE_BREAK_MARKER, searchFrom);
    const segmentEnd = markerIdx === -1 ? rawContent.length : markerIdx;
    const rawSegment = rawContent.slice(searchFrom, segmentEnd);
    const trimmed = rawSegment.trim();

    if (trimmed.length > 0) {
      const leadingWs = rawSegment.length - rawSegment.trimStart().length;
      const start = searchFrom + leadingWs;
      const end = start + trimmed.length;
      ranges.push({
        index: pageIdx,
        start,
        end,
        text: trimmed,
      });
      pageIdx += 1;
    }

    if (markerIdx === -1) break;
    searchFrom = markerIdx + PAGE_BREAK_MARKER.length;
  }

  if (ranges.length === 0) {
    return [{ index: 0, start: 0, end: rawContent.length, text: rawContent.trim() }];
  }

  return ranges;
}

interface GraphemeToken {
  segment: string;
  index: number;
}

function segmentGraphemes(text: string): GraphemeToken[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const SegmenterCtor = (
      Intl as unknown as {
        Segmenter: new (
          locale?: string,
          opts?: { granularity: 'grapheme' },
        ) => {
          segment: (input: string) => Iterable<{ segment: string; index: number }>;
        };
      }
    ).Segmenter;
    const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (item) => ({
      segment: item.segment,
      index: item.index,
    }));
  }

  // Fallback: group Unicode combining marks & ZWJ with preceding character
  const tokens: GraphemeToken[] = [];
  const codePoints = Array.from(text);
  let offset = 0;
  for (const cp of codePoints) {
    const isCombining = /[\p{M}\u200D]/u.test(cp);
    if (isCombining && tokens.length > 0) {
      tokens[tokens.length - 1].segment += cp;
    } else {
      tokens.push({ segment: cp, index: offset });
    }
    offset += cp.length;
  }
  return tokens;
}

function measureTextMetrics(text: string): { graphemes: number; visualLines: number } {
  const tokens = segmentGraphemes(text);
  const CHARS_PER_MOBILE_LINE = 36;
  let visualLines = 0;
  let currentLineLen = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const seg = tokens[i].segment;
    if (seg === '\n') {
      visualLines += currentLineLen === 0 ? 0.65 : Math.max(1, Math.ceil(currentLineLen / CHARS_PER_MOBILE_LINE));
      currentLineLen = 0;
    } else {
      currentLineLen += 1;
    }
  }
  if (currentLineLen > 0) {
    visualLines += Math.max(1, Math.ceil(currentLineLen / CHARS_PER_MOBILE_LINE));
  }

  return {
    graphemes: tokens.length,
    visualLines: Math.max(1, visualLines),
  };
}

export function autoCutText(rawContent: string): string {
  const cleaned = rawContent
    .replace(/\r\n?/g, '\n')
    .split(PAGE_BREAK_MARKER)
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, ''))
    .filter((chunk) => chunk.trim().length > 0)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return '';

  const MAX_GRAPHEMES = 520;
  const MAX_VISUAL_LINES = 11.5;
  const ORPHAN_GRACE_GRAPHEMES = 570;
  const ORPHAN_GRACE_LINES = 12.2;
  const CHARS_PER_MOBILE_LINE = 36;

  const pages: string[] = [];
  let cursor = 0;

  while (cursor < cleaned.length) {
    while (cursor < cleaned.length && /[ \t\n]/.test(cleaned[cursor])) {
      cursor += 1;
    }
    if (cursor >= cleaned.length) break;

    const remaining = cleaned.slice(cursor);
    const remainingMetrics = measureTextMetrics(remaining);

    if (
      remainingMetrics.graphemes <= ORPHAN_GRACE_GRAPHEMES &&
      remainingMetrics.visualLines <= ORPHAN_GRACE_LINES
    ) {
      pages.push(remaining.trim());
      break;
    }

    // Balance penultimate split slightly when remaining is just above 1 page
    const effectiveMaxGraphemes =
      remainingMetrics.graphemes <= 760 && remainingMetrics.visualLines <= 17
        ? Math.max(320, Math.floor(remainingMetrics.graphemes * 0.56))
        : MAX_GRAPHEMES;

    const tokens = segmentGraphemes(remaining);
    let gCount = 0;
    let vLines = 0;
    let lineChars = 0;
    let limitOffset = remaining.length;
    let minOffset = 0;

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      if (tok.segment === '\n') {
        vLines += lineChars === 0 ? 0.65 : Math.max(1, Math.ceil(lineChars / CHARS_PER_MOBILE_LINE));
        lineChars = 0;
      } else {
        lineChars += 1;
      }
      gCount += 1;

      const currentLineEstimate =
        vLines + (lineChars > 0 ? Math.ceil(lineChars / CHARS_PER_MOBILE_LINE) : 0);

      if (minOffset === 0 && (gCount >= 190 || currentLineEstimate >= 4.5)) {
        minOffset = tok.index + tok.segment.length;
      }

      if (gCount > effectiveMaxGraphemes || currentLineEstimate > MAX_VISUAL_LINES) {
        limitOffset = tok.index;
        break;
      }
    }

    if (limitOffset <= 0 && tokens.length > 0) {
      limitOffset = tokens[0].segment.length;
    }
    if (minOffset === 0 || minOffset > limitOffset) {
      minOffset = Math.floor(limitOffset * 0.45);
    }

    const windowSlice = remaining.slice(0, limitOffset);
    let cutOffset = -1;

    // 1. Prioritize paragraph breaks (\n\n)
    const lastPara = windowSlice.lastIndexOf('\n\n');
    if (lastPara >= minOffset) {
      cutOffset = lastPara;
    }

    // 2. Fallback to single line break (\n)
    if (cutOffset === -1) {
      const lastLine = windowSlice.lastIndexOf('\n');
      if (lastLine >= minOffset) {
        cutOffset = lastLine;
      }
    }

    // 3. Fallback to sentence endings (. ! ? … ।) followed by whitespace or end of window
    if (cutOffset === -1) {
      const sentenceRegex = /[.!?…।](?:["'”’)\]]*)(?=\s|$)/g;
      let match: RegExpExecArray | null;
      let lastSentenceEnd = -1;
      while ((match = sentenceRegex.exec(windowSlice)) !== null) {
        const endPos = match.index + match[0].length;
        if (endPos >= minOffset) {
          lastSentenceEnd = endPos;
        }
      }
      if (lastSentenceEnd !== -1) {
        cutOffset = lastSentenceEnd;
      }
    }

    // 4. Fallback to word space
    if (cutOffset === -1) {
      const spaceMin = Math.min(minOffset, 24);
      for (let idx = windowSlice.length - 1; idx >= spaceMin; idx -= 1) {
        if (windowSlice[idx] === ' ' || windowSlice[idx] === '\t') {
          cutOffset = idx;
          break;
        }
      }
    }

    // 5. Final fallback: grapheme-cluster-aligned limitOffset
    if (cutOffset <= 0) {
      cutOffset = limitOffset;
    }

    const pageSlice = remaining.slice(0, cutOffset).trim();
    if (pageSlice.length > 0) {
      pages.push(pageSlice);
    }
    cursor += cutOffset;
  }

  return pages.join(`\n\n${PAGE_BREAK_MARKER}\n\n`);
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
