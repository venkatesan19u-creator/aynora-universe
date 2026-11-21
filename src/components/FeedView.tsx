import { BookOpen, Eye, Heart, Plus } from 'lucide-react';
import { TabType, WorkItem } from '../types';
import { formatCount } from '../utils/storage';
import { BookCard } from './BookCard';

interface FeedViewProps {
  activeTab: Exclude<TabType, 'write'>;
  activeCategory: string;
  works: WorkItem[];
  allWorksCount: number;
  writerName: string;
  isAdminLoggedIn: boolean;
  onOpenWork: (work: WorkItem) => void;
  onEditWork: (work: WorkItem) => void;
  onAddEpisode: (work: WorkItem) => void;
  onDeleteWork: (work: WorkItem) => void;
  onGoToWrite?: () => void;
}

export function FeedView({
  activeTab,
  activeCategory,
  works,
  allWorksCount,
  writerName,
  isAdminLoggedIn,
  onOpenWork,
  onEditWork,
  onAddEpisode,
  onDeleteWork,
  onGoToWrite,
}: FeedViewProps) {
  const isHomeAll = activeTab === 'home' && activeCategory === 'all';
  const featuredWorks = isHomeAll
    ? [...works].sort((a, b) => b.stats.views - a.stats.views).slice(0, 4)
    : [];

  const sectionHeading =
    activeTab === 'home'
      ? activeCategory === 'all'
        ? 'All Published Works'
        : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Collection`
      : activeCategory === 'all'
        ? `All ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Works`
        : activeCategory;

  return (
    <div className="px-3.5 pt-3 pb-28 space-y-5">
      {/* Featured Releases Horizontal Shelf on Home */}
      {isHomeAll && featuredWorks.length > 0 && (
        <section aria-label="Featured Releases">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="font-display text-[20px] font-semibold tracking-wide text-white">
              Featured Releases
            </h2>
            <span className="text-[11.5px] text-[#F3DCB3]/80 tabular-nums">
              {allWorksCount} Published
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featuredWorks.map((work) => (
              <button
                key={`featured-${work.id}`}
                type="button"
                onClick={() => onOpenWork(work)}
                className="shrink-0 w-[124px] glass-panel rounded-2xl p-1.5 text-left active:scale-[0.98] transition"
              >
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1038]">
                  <img
                    src={work.coverUrl}
                    alt={work.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-medium text-[#F3DCB3] truncate">
                    {work.type.toUpperCase()} · {work.episodes.length}{' '}
                    {work.episodes.length === 1 ? 'Ep' : 'Eps'}
                  </span>
                </div>
                <p className="font-literary text-[12.5px] font-semibold text-white mt-1.5 px-1 line-clamp-1">
                  {work.title}
                </p>
                <div className="flex items-center justify-between px-1 mt-0.5 text-[10px] text-white/70 tabular-nums">
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5 text-[#F3DCB3]/80" />
                    {formatCount(work.stats.views)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5 text-rose-300" />
                    {formatCount(work.stats.likes)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid Section */}
      <section aria-label={sectionHeading}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-[20px] font-semibold tracking-wide text-white">
            {sectionHeading}
          </h2>
          <span className="text-[12px] text-[#F3DCB3]/85 tabular-nums">
            {works.length} {works.length === 1 ? 'Work' : 'Works'}
          </span>
        </div>

        {works.length === 0 ? (
          <div className="glass-panel rounded-3xl p-7 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F3DCB3]/15 border border-[#F3DCB3]/30 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-[#F3DCB3]" />
            </div>
            <p className="text-sm font-medium text-white">
              No works published in this category yet
            </p>
            <p className="text-xs text-white/65 mt-1">
              Explore other genres above or check back soon for new releases.
            </p>
            {isAdminLoggedIn && onGoToWrite && (
              <button
                type="button"
                onClick={onGoToWrite}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-semibold active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish New Work</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {works.map((work) => (
              <BookCard
                key={work.id}
                work={work}
                writerName={writerName}
                isAdminLoggedIn={isAdminLoggedIn}
                onOpen={onOpenWork}
                onEdit={onEditWork}
                onAddEpisode={onAddEpisode}
                onDelete={onDeleteWork}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
