import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Heart,
  MessageCircle,
  Moon,
  Plus,
  Send,
  Share2,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { ReaderTheme, WorkItem, WriterProfile } from '../types';
import { formatCount, splitPages } from '../utils/storage';

interface ReelsReaderModalProps {
  work: WorkItem;
  writerProfile: WriterProfile;
  readerTheme: ReaderTheme;
  isAdminLoggedIn: boolean;
  isPreview?: boolean;
  onClose: () => void;
  onChangeReaderTheme: (theme: ReaderTheme) => void;
  onOpenWriterProfile: () => void;
  onToggleLike: (workId: string) => void;
  onRateEpisode: (
    workId: string,
    episodeId: string,
    episodeNumber: number,
    stars: number,
  ) => void;
  onAddComment: (
    workId: string,
    episodeNumber: number,
    author: string,
    text: string,
  ) => void;
  onShareWork: (workId: string) => void;
  onEditWork?: (work: WorkItem, episodeId?: string) => void;
  onAddEpisode?: (work: WorkItem) => void;
}

export function ReelsReaderModal({
  work,
  writerProfile,
  readerTheme,
  isAdminLoggedIn,
  isPreview = false,
  onClose,
  onChangeReaderTheme,
  onOpenWriterProfile,
  onToggleLike,
  onRateEpisode,
  onAddComment,
  onShareWork,
  onEditWork,
  onAddEpisode,
}: ReelsReaderModalProps) {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showCommentsBox, setShowCommentsBox] = useState(true);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [episodeToast, setEpisodeToast] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const nextSentinelRef = useRef<HTMLDivElement>(null);
  const autoAdvanceLockRef = useRef(false);

  const safeEpisodeIndex = Math.min(
    activeEpisodeIndex,
    Math.max(0, work.episodes.length - 1),
  );
  const currentEpisode = work.episodes[safeEpisodeIndex] ?? work.episodes[0];
  const currentEpNum = currentEpisode?.episodeNumber ?? 1;
  const pages = useMemo(
    () =>
      currentEpisode?.pages?.length
        ? currentEpisode.pages
        : splitPages(currentEpisode?.rawContent ?? ''),
    [currentEpisode?.pages, currentEpisode?.rawContent],
  );
  const hasNextEpisode = safeEpisodeIndex + 1 < work.episodes.length;

  const avgRating =
    work.stats.ratingCount > 0
      ? (work.stats.ratingSum / work.stats.ratingCount).toFixed(1)
      : '0.0';

  const epRatingCount = currentEpisode?.ratingCount ?? 0;
  const epAvgRating =
    epRatingCount > 0
      ? (currentEpisode.ratingSum / epRatingCount).toFixed(1)
      : '0.0';
  const currentUserEpRating = work.userEpisodeRatings?.[currentEpNum] ?? 0;

  const isPaper = readerTheme === 'paper';

  const scrollToSlide = (slideIndex: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({
      top: slideIndex * el.clientHeight,
      behavior: 'smooth',
    });
  };

  const jumpToEpisode = (epIndex: number, startAtPageOne = true) => {
    autoAdvanceLockRef.current = true;
    setActiveEpisodeIndex(epIndex);
    const ep = work.episodes[epIndex];
    if (ep) {
      setEpisodeToast(`Episode ${ep.episodeNumber}: ${ep.title}`);
      setTimeout(() => setEpisodeToast(null), 2200);
    }
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) {
        el.scrollTo({
          top: startAtPageOne ? el.clientHeight : 0,
          behavior: 'auto',
        });
      }
      setTimeout(() => {
        autoAdvanceLockRef.current = false;
      }, 450);
    });
  };

  // Auto-next episode when user scrolls/swipes past the end-of-episode interaction page
  useEffect(() => {
    const sentinel = nextSentinelRef.current;
    const root = scrollerRef.current;
    if (!sentinel || !root || !hasNextEpisode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !autoAdvanceLockRef.current) {
          jumpToEpisode(safeEpisodeIndex + 1, true);
        }
      },
      { root, threshold: 0.6 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });

  const handleTriggerShare = async () => {
    onShareWork(work.id);
    const shareUrl = `${window.location.origin}${window.location.pathname}#work-${work.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${work.title} — AYNORA UNIVERSE`,
          text: work.description,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShareToast('Link copied & shared!');
    } catch {
      setShareToast('Share recorded!');
    }
    setTimeout(() => setShareToast(null), 2400);
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(
      work.id,
      currentEpNum,
      commentAuthor.trim() || 'Reader',
      commentText.trim(),
    );
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#06030E]/90 backdrop-blur-lg">
      <div
        className={`w-full max-w-[430px] h-dvh flex flex-col relative overflow-hidden transition-colors duration-300 ${
          isPaper
            ? 'bg-[#F6EFE2] text-[#231B15]'
            : 'cosmic-canvas text-white'
        }`}
      >
        {!isPaper && <div className="cosmic-stars absolute inset-0" />}

        {/* Top Reader Bar */}
        <div
          className={`relative z-20 flex items-center justify-between gap-2 px-3 py-2.5 border-b backdrop-blur-xl ${
            isPaper
              ? 'bg-[#EFE4D1]/90 border-[#231B15]/10 text-[#231B15]'
              : 'bg-[#130A2B]/80 border-white/10 text-white'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Reader"
            className={`min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center active:scale-95 transition ${
              isPaper
                ? 'bg-[#231B15]/10 hover:bg-[#231B15]/15'
                : 'glass-pill hover:bg-white/15'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <p className="font-literary text-sm font-semibold truncate">
              {work.title}
            </p>
            <p
              className={`text-[11px] truncate tabular-nums ${
                isPaper ? 'text-[#5A483A]' : 'text-[#F3DCB3]/85'
              }`}
            >
              {isPreview ? 'Draft Preview · ' : ''}
              Episode {currentEpisode?.episodeNumber ?? 1} of{' '}
              {work.episodes.length}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAdminLoggedIn && !isPreview && onEditWork && (
              <button
                type="button"
                onClick={() => onEditWork(work, currentEpisode?.id)}
                aria-label="Edit current episode"
                className={`min-w-[38px] min-h-[38px] rounded-full flex items-center justify-center transition ${
                  isPaper
                    ? 'bg-[#231B15]/10 text-[#231B15]'
                    : 'glass-pill text-[#F3DCB3]'
                }`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onChangeReaderTheme(isPaper ? 'glass' : 'paper')
              }
              aria-label="Toggle reading theme"
              title={
                isPaper ? 'Switch to Dark Glass' : 'Switch to Warm Paper'
              }
              className={`min-h-[38px] px-2.5 rounded-full flex items-center gap-1 text-[11px] font-medium active:scale-95 transition ${
                isPaper
                  ? 'bg-[#231B15] text-[#F6EFE2]'
                  : 'glass-pill text-[#F3DCB3]'
              }`}
            >
              {isPaper ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Glass</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Paper</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Floating Episode Switch Toast */}
        {episodeToast && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-semibold shadow-lg whitespace-nowrap">
            {episodeToast}
          </div>
        )}

        {/* Reels Vertical Snap-Scrolling Container */}
        <div
          ref={scrollerRef}
          className="relative z-10 flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
          {/* SCREEN 0: COVER & EPISODE OVERVIEW */}
          <section className="snap-start h-full w-full shrink-0 overflow-y-auto px-4 py-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex gap-3.5 items-start">
                <img
                  src={work.coverUrl}
                  alt={work.title}
                  referrerPolicy="no-referrer"
                  className="w-[120px] aspect-[2/3] rounded-2xl object-cover shadow-xl border border-white/15 shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-2">
                  <span
                    className={`inline-block text-[11px] font-semibold uppercase tracking-wider ${
                      isPaper ? 'text-[#7A542B]' : 'text-[#F3DCB3]'
                    }`}
                  >
                    {work.type} · {work.category}
                  </span>
                  <h2 className="font-literary text-xl font-bold leading-snug">
                    {work.title}
                  </h2>

                  {/* Writer Profile Badge */}
                  <button
                    type="button"
                    onClick={onOpenWriterProfile}
                    className={`inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full transition ${
                      isPaper
                        ? 'bg-[#231B15]/10 hover:bg-[#231B15]/15'
                        : 'glass-pill hover:bg-white/15'
                    }`}
                  >
                    <img
                      src={writerProfile.photoUrl}
                      alt={writerProfile.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-medium truncate max-w-[140px]">
                      {writerProfile.name}
                    </span>
                  </button>

                  {/* Metrics summary */}
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums ${
                      isPaper ? 'text-[#5A483A]' : 'text-white/75'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {formatCount(work.stats.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      {formatCount(work.stats.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {avgRating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  isPaper
                    ? 'bg-[#EADEC9]/70 border-[#231B15]/10 text-[#3B2E24]'
                    : 'glass-panel text-white/90'
                }`}
              >
                <p className="text-[13px] leading-relaxed font-literary">
                  {work.description}
                </p>
              </div>

              {/* Episodes List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Episodes ({work.episodes.length})
                  </h3>
                  {isAdminLoggedIn && !isPreview && onAddEpisode && (
                    <button
                      type="button"
                      onClick={() => onAddEpisode(work)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                        isPaper
                          ? 'bg-[#231B15] text-[#F6EFE2]'
                          : 'bg-[#F3DCB3] text-[#1A1033]'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Episode</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-0.5">
                  {work.episodes.map((ep, idx) => {
                    const epPages = splitPages(ep.rawContent).length;
                    const isSelected = idx === safeEpisodeIndex;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => jumpToEpisode(idx, true)}
                        className={`w-full px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition active:scale-[0.99] ${
                          isSelected
                            ? isPaper
                              ? 'bg-[#231B15] text-[#F6EFE2] border-[#231B15]'
                              : 'bg-[#F3DCB3]/20 border-[#F3DCB3] text-white'
                            : isPaper
                              ? 'bg-white/60 border-[#231B15]/10 text-[#231B15]'
                              : 'glass-pill text-white/90 hover:bg-white/15'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold opacity-80">
                            Episode {ep.episodeNumber}
                          </span>
                          <p className="font-literary text-sm font-semibold truncate">
                            {ep.title}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] opacity-75 tabular-nums">
                          {epPages} {epPages === 1 ? 'pg' : 'pgs'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollToSlide(1)}
              className={`mt-4 w-full min-h-[48px] rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition ${
                isPaper
                  ? 'bg-[#231B15] text-[#F6EFE2]'
                  : 'bg-[#F3DCB3] text-[#1A1033]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Start Reading · Episode {currentEpisode?.episodeNumber ?? 1}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </section>

          {/* STORY / NOVEL / POETRY PAGES */}
          {pages.map((pageText, pageIdx) => (
            <section
              key={`${currentEpisode?.id}-pg-${pageIdx}`}
              className="snap-start h-full w-full shrink-0 p-4 flex flex-col justify-between"
            >
              {/* Page Top Meta */}
              <div className="flex items-center justify-between text-xs opacity-75">
                <span className="font-medium truncate max-w-[65%]">
                  Ep {currentEpisode?.episodeNumber ?? 1} · {currentEpisode?.title}
                </span>
                <span className="tabular-nums font-semibold">
                  Page {pageIdx + 1} / {pages.length}
                </span>
              </div>

              {/* Page Body Card */}
              <div
                className={`my-3 flex-1 rounded-3xl p-5 overflow-y-auto flex flex-col justify-center border ${
                  isPaper
                    ? 'bg-[#FBF7EE] border-[#231B15]/10 text-[#231B15] shadow-sm'
                    : 'glass-panel text-[#FBF7EE]'
                }`}
              >
                <div className="font-literary text-[17px] leading-[1.85] whitespace-pre-line">
                  {pageText}
                </div>
              </div>

              {/* Quick Page Navigation Controls */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => scrollToSlide(pageIdx)}
                  className="min-h-[36px] px-3 rounded-full opacity-75 hover:opacity-100 flex items-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <span className="text-[11px] opacity-60">
                  Swipe up for next page
                </span>

                <button
                  type="button"
                  onClick={() => scrollToSlide(pageIdx + 2)}
                  className="min-h-[36px] px-3 rounded-full opacity-75 hover:opacity-100 flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </section>
          ))}

          {/* END-OF-EPISODE INTERACTION PAGE */}
          <section className="snap-start h-full w-full shrink-0 p-4 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="text-center pt-1">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-widest ${
                    isPaper ? 'text-[#7A542B]' : 'text-[#F3DCB3]'
                  }`}
                >
                  End of Episode {currentEpisode?.episodeNumber ?? 1}
                </p>
                <h3 className="font-literary text-xl font-bold mt-1">
                  {currentEpisode?.title || work.title}
                </h3>
              </div>

              {/* 1. Star Rating (1-5 Stars) */}
              <div
                className={`rounded-2xl p-3.5 border text-center ${
                  isPaper
                    ? 'bg-[#FBF7EE] border-[#231B15]/10'
                    : 'glass-panel'
                }`}
              >
                <p className="text-xs font-medium opacity-80 mb-2">
                  Rate Episode {currentEpNum} ({epAvgRating} ★ · {epRatingCount}{' '}
                  ratings)
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = currentUserEpRating >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        disabled={isPreview || !currentEpisode}
                        onClick={() =>
                          currentEpisode &&
                          onRateEpisode(
                            work.id,
                            currentEpisode.id,
                            currentEpNum,
                            star,
                          )
                        }
                        aria-label={`Rate ${star} stars`}
                        className="p-1.5 active:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            active
                              ? 'text-amber-400 fill-amber-400'
                              : isPaper
                                ? 'text-[#231B15]/25'
                                : 'text-white/30'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2, 3, 4: Like, Comment Toggle, Share */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={isPreview}
                  onClick={() => onToggleLike(work.id)}
                  className={`min-h-[48px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-xs font-semibold active:scale-95 transition ${
                    work.userLiked
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : isPaper
                        ? 'bg-[#FBF7EE] border-[#231B15]/15 text-[#231B15]'
                        : 'glass-panel text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      work.userLiked ? 'fill-rose-400 text-rose-400' : ''
                    }`}
                  />
                  <span className="tabular-nums">
                    Like ({work.stats.likes})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommentsBox((v) => !v)}
                  className={`min-h-[48px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-xs font-semibold active:scale-95 transition ${
                    isPaper
                      ? 'bg-[#FBF7EE] border-[#231B15]/15 text-[#231B15]'
                      : 'glass-panel text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-sky-400" />
                  <span className="tabular-nums">
                    Comment ({work.comments.length})
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isPreview}
                  onClick={handleTriggerShare}
                  className={`min-h-[48px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 text-xs font-semibold active:scale-95 transition ${
                    isPaper
                      ? 'bg-[#FBF7EE] border-[#231B15]/15 text-[#231B15]'
                      : 'glass-panel text-white'
                  }`}
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span className="tabular-nums">
                    Share ({work.stats.shares})
                  </span>
                </button>
              </div>

              {shareToast && (
                <p className="text-center text-xs font-medium text-emerald-400">
                  {shareToast}
                </p>
              )}

              {/* Interactive Comment Box */}
              {showCommentsBox && (
                <div
                  className={`rounded-2xl p-3 border space-y-2.5 ${
                    isPaper
                      ? 'bg-[#FBF7EE] border-[#231B15]/10'
                      : 'glass-panel'
                  }`}
                >
                  {!isPreview && (
                    <form onSubmit={handleSubmitComment} className="space-y-2">
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        placeholder="Your name (optional)"
                        className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                          isPaper
                            ? 'bg-white border-[#231B15]/15 text-[#231B15]'
                            : 'bg-white/10 border-white/15 text-white placeholder:text-white/45'
                        }`}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write your thoughts on this episode..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                            isPaper
                              ? 'bg-white border-[#231B15]/15 text-[#231B15]'
                              : 'bg-white/10 border-white/15 text-white placeholder:text-white/45'
                          }`}
                        />
                        <button
                          type="submit"
                          aria-label="Post comment"
                          className={`min-w-[40px] rounded-xl flex items-center justify-center active:scale-95 transition ${
                            isPaper
                              ? 'bg-[#231B15] text-[#F6EFE2]'
                              : 'bg-[#F3DCB3] text-[#1A1033]'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="max-h-[155px] overflow-y-auto space-y-2 pr-1">
                    {work.comments.length === 0 ? (
                      <p className="text-xs opacity-60 text-center py-2">
                        Be the first reader to comment.
                      </p>
                    ) : (
                      work.comments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className={`p-2 rounded-xl text-xs ${
                            isPaper ? 'bg-[#EFE4D1]/70' : 'bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[11px] opacity-85">
                              {cmt.author}
                            </p>
                            <span className="text-[10px] opacity-60 tabular-nums">
                              Ep {cmt.episodeNumber}
                            </span>
                          </div>
                          <p className="mt-0.5 leading-snug">{cmt.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Next Episode Prompt */}
            {hasNextEpisode ? (
              <button
                type="button"
                onClick={() => jumpToEpisode(safeEpisodeIndex + 1, true)}
                className={`mt-3 w-full min-h-[46px] rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition ${
                  isPaper
                    ? 'bg-[#231B15] text-[#F6EFE2]'
                    : 'bg-[#F3DCB3] text-[#1A1033]'
                }`}
              >
                <span>
                  Scroll or Tap for Next: Episode{' '}
                  {work.episodes[safeEpisodeIndex + 1].episodeNumber}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scrollToSlide(0)}
                className="mt-3 w-full min-h-[42px] rounded-full border border-current/20 text-xs font-medium opacity-80"
              >
                Back to Cover Overview
              </button>
            )}
          </section>

          {/* AUTO-NEXT EPISODE SENTINEL SLIDE */}
          {hasNextEpisode && (
            <section
              ref={nextSentinelRef}
              className="snap-start h-full w-full shrink-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <p className="text-xs uppercase tracking-widest opacity-70">
                Loading Next Episode
              </p>
              <p className="font-literary text-lg font-semibold mt-1">
                Episode {work.episodes[safeEpisodeIndex + 1].episodeNumber}:{' '}
                {work.episodes[safeEpisodeIndex + 1].title}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
