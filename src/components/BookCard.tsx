import { useState } from 'react';
import {
  BookOpen,
  Edit3,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { WorkItem } from '../types';
import { formatCount } from '../utils/storage';

interface BookCardProps {
  work: WorkItem;
  writerName: string;
  isAdminLoggedIn: boolean;
  onOpen: (work: WorkItem) => void;
  onEdit?: (work: WorkItem) => void;
  onAddEpisode?: (work: WorkItem) => void;
  onDelete?: (work: WorkItem) => void;
}

export function BookCard({
  work,
  writerName,
  isAdminLoggedIn,
  onOpen,
  onEdit,
  onAddEpisode,
  onDelete,
}: BookCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="glass-panel rounded-2xl p-2 flex flex-col transition-transform duration-150">
      {/* 2:3 Book Cover */}
      <button
        type="button"
        onClick={() => onOpen(work)}
        className="group relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1038] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3DCB3]"
      >
        {!imgError && work.coverUrl ? (
          <img
            src={work.coverUrl}
            alt={work.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#2A1956] to-[#130A29]">
            <BookOpen className="w-7 h-7 text-[#F3DCB3]/75 mb-2" />
            <span className="font-literary text-xs text-[#F3DCB3] line-clamp-3">
              {work.title}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-medium text-[#F3DCB3]/95">
          <span className="truncate">{work.category}</span>
          <span className="shrink-0 tabular-nums">
            {work.episodes.length} {work.episodes.length === 1 ? 'Ep' : 'Eps'}
          </span>
        </div>
      </button>

      {/* Title, Author, and Live Engagement Metrics */}
      <div className="pt-2 px-1 flex-1 flex flex-col justify-between">
        <button
          type="button"
          onClick={() => onOpen(work)}
          className="text-left focus-visible:outline-none"
        >
          <h3 className="font-literary text-[14px] font-semibold text-white leading-snug line-clamp-2">
            {work.title}
          </h3>
          <p className="text-[11px] text-[#F3DCB3]/80 mt-0.5 truncate">
            {work.writerName || writerName}
          </p>
        </button>

        {/* Views, Likes, Comments, Shares */}
        <div className="mt-2 pt-1.5 border-t border-white/10 grid grid-cols-4 gap-1 text-[10.5px] text-white/80 tabular-nums">
          <span className="flex items-center gap-1" title="Views">
            <Eye className="w-3 h-3 text-[#F3DCB3]/85 shrink-0" />
            <span className="truncate">{formatCount(work.stats.views)}</span>
          </span>
          <span className="flex items-center gap-1" title="Likes">
            <Heart
              className={`w-3 h-3 shrink-0 ${
                work.userLiked ? 'text-rose-400 fill-rose-400' : 'text-rose-300/85'
              }`}
            />
            <span className="truncate">{formatCount(work.stats.likes)}</span>
          </span>
          <span className="flex items-center gap-1" title="Comments">
            <MessageCircle className="w-3 h-3 text-sky-300/85 shrink-0" />
            <span className="truncate">
              {formatCount(
                Math.max(work.stats.commentsCount, work.comments.length),
              )}
            </span>
          </span>
          <span className="flex items-center gap-1" title="Shares">
            <Share2 className="w-3 h-3 text-emerald-300/85 shrink-0" />
            <span className="truncate">{formatCount(work.stats.shares)}</span>
          </span>
        </div>

        {/* Admin Actions when logged in */}
        {isAdminLoggedIn && (onEdit || onAddEpisode || onDelete) && (
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1">
            {onAddEpisode && (
              <button
                type="button"
                onClick={() => onAddEpisode(work)}
                className="flex-1 min-h-[28px] px-1.5 rounded-lg bg-[#F3DCB3]/15 hover:bg-[#F3DCB3]/25 text-[#F3DCB3] text-[10.5px] font-medium flex items-center justify-center gap-0.5 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Ep</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(work)}
                aria-label={`Edit ${work.title}`}
                className="min-h-[28px] px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-[10.5px] font-medium flex items-center justify-center gap-1 transition"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(work)}
                aria-label={`Delete ${work.title}`}
                className="min-h-[28px] px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 flex items-center justify-center transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
