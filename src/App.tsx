import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { CategoryBar, CategoryPillItem } from './components/CategoryBar';
import { FeedView } from './components/FeedView';
import {
  AdminLockAlert,
  InstallGuideModal,
  NotificationsModal,
  SearchModal,
  SettingsModal,
  WriterProfileModal,
} from './components/Modals';
import { ReelsReaderModal } from './components/ReelsReaderModal';
import { TopHeader } from './components/TopHeader';
import { WriteInitialContext, WriteStudio } from './components/WriteStudio';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_WRITER_PROFILE,
  INITIAL_WORKS,
} from './data/seedData';
import {
  addEpisodeToWorkInDb,
  deleteWorkFromDb,
  fetchAllPublicData,
  incrementWorkSharesInDb,
  incrementWorkViewsInDb,
  insertCommentAndSyncCountInDb,
  publishNewWorkToDb,
  seedInitialSupabaseData,
  subscribeToAynoraChanges,
  updateAdminPinInDb,
  updateEpisodeRatingInDb,
  updateWorkAndEpisodeInDb,
  updateWorkLikesInDb,
  updateWriterProfileInDb,
} from './lib/supabase';
import {
  CATEGORIES_BY_TYPE,
  DraftItem,
  NotificationItem,
  ReaderTheme,
  TabType,
  WorkItem,
  WorkType,
  WriterProfile,
} from './types';
import {
  loadAdminSession,
  loadDrafts,
  loadReaderTheme,
  loadReadNotifIds,
  loadUserEpisodeRatings,
  loadUserLikes,
  saveAdminSession,
  saveDrafts,
  saveReaderTheme,
  saveReadNotifIds,
  saveUserEpisodeRatings,
  saveUserLikes,
  splitPages,
} from './utils/storage';

function buildNotificationsFromWorks(
  works: WorkItem[],
  readIds: string[],
): NotificationItem[] {
  const readSet = new Set(readIds);
  const items: NotificationItem[] = [];

  works.forEach((w) => {
    const latestEp = w.episodes[w.episodes.length - 1];
    if (!latestEp) return;
    const notifId = `notif-${w.id}-ep-${latestEp.episodeNumber}`;
    items.push({
      id: notifId,
      workId: w.id,
      title:
        latestEp.episodeNumber > 1
          ? 'New Episode Released'
          : `New ${w.type.charAt(0).toUpperCase() + w.type.slice(1)} Published`,
      message:
        latestEp.episodeNumber > 1
          ? `Episode ${latestEp.episodeNumber} of “${w.title}” is now live.`
          : `“${w.title}” is now live in ${w.category}.`,
      createdAt: latestEp.publishedAt || w.createdAt,
      read: readSet.has(notifId),
    });
  });

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20);
}

export default function App() {
  const [works, setWorks] = useState<WorkItem[]>(INITIAL_WORKS);
  const [writerProfile, setWriterProfile] = useState<WriterProfile>(
    DEFAULT_WRITER_PROFILE,
  );
  const [adminPin, setAdminPin] = useState<string>(DEFAULT_ADMIN_PIN);
  const [dbStatus, setDbStatus] = useState<
    'loading' | 'connected' | 'missing_schema' | 'error'
  >('loading');

  // Private local device state (Drafts, Admin session, Reader theme, Reader likes/ratings/read alerts)
  const [drafts, setDrafts] = useState<DraftItem[]>(() => loadDrafts());
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() =>
    loadAdminSession(),
  );
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() =>
    loadReaderTheme(),
  );
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>(() =>
    loadUserLikes(),
  );
  const [userEpisodeRatings, setUserEpisodeRatings] = useState<
    Record<string, number>
  >(() => loadUserEpisodeRatings());
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() =>
    loadReadNotifIds(),
  );

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [readingWorkId, setReadingWorkId] = useState<string | null>(null);
  const [previewDraftWork, setPreviewDraftWork] = useState<WorkItem | null>(
    null,
  );
  const [writeContext, setWriteContext] = useState<WriteInitialContext | null>(
    null,
  );

  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingDeleteWork, setPendingDeleteWork] = useState<WorkItem | null>(
    null,
  );

  const {
    isInstalled,
    showInstallGuide,
    closeInstallGuide,
    triggerInstall,
  } = usePWAInstall();

  const userLikesRef = useRef(userLikes);
  userLikesRef.current = userLikes;
  const userEpRatingsRef = useRef(userEpisodeRatings);
  userEpRatingsRef.current = userEpisodeRatings;

  // Persist local device preferences & private drafts
  useEffect(() => saveDrafts(drafts), [drafts]);
  useEffect(() => saveAdminSession(isAdminLoggedIn), [isAdminLoggedIn]);
  useEffect(() => saveReaderTheme(readerTheme), [readerTheme]);
  useEffect(() => saveUserLikes(userLikes), [userLikes]);
  useEffect(() => saveUserEpisodeRatings(userEpisodeRatings), [userEpisodeRatings]);
  useEffect(() => saveReadNotifIds(readNotifIds), [readNotifIds]);

  const syncFromSupabase = useCallback(async () => {
    const result = await fetchAllPublicData(
      userLikesRef.current,
      userEpRatingsRef.current,
    );
    setDbStatus(result.status);
    setWorks(result.works);
    setWriterProfile(result.writerProfile);
    setAdminPin(result.adminPin);
  }, []);

  // Initial fetch + Supabase Realtime live subscription across all readers worldwide
  useEffect(() => {
    let mounted = true;
    syncFromSupabase().then(() => {
      if (!mounted) return;
      const hash = window.location.hash;
      if (hash.startsWith('#work-')) {
        const targetId = hash.replace('#work-', '');
        setReadingWorkId(targetId);
      }
    });

    let debounceTimer: number | undefined;
    const unsubscribe = subscribeToAynoraChanges(() => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        if (mounted) {
          void syncFromSupabase();
        }
      }, 250);
    });

    return () => {
      mounted = false;
      window.clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [syncFromSupabase]);

  const notifications = useMemo(
    () => buildNotificationsFromWorks(works, readNotifIds),
    [works, readNotifIds],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const handleSelectTab = (nextTab: TabType) => {
    if (nextTab === 'write' && !isAdminLoggedIn) {
      setShowAdminAlert(true);
      return;
    }
    setActiveTab(nextTab);
    setActiveCategory('all');
  };

  // Strict category pills per tab
  const categoryPills: CategoryPillItem[] = useMemo(() => {
    if (activeTab === 'home') {
      const novelCount = works.filter((w) => w.type === 'novel').length;
      const storyCount = works.filter((w) => w.type === 'story').length;
      const poetryCount = works.filter((w) => w.type === 'poetry').length;
      return [
        { id: 'all', label: 'All Categories', count: works.length },
        { id: 'novel', label: 'Novel', count: novelCount },
        { id: 'story', label: 'Story', count: storyCount },
        { id: 'poetry', label: 'Poetry', count: poetryCount },
      ];
    }

    if (activeTab === 'write') return [];

    const typeWorks = works.filter((w) => w.type === activeTab);
    const categories = CATEGORIES_BY_TYPE[activeTab];
    return [
      { id: 'all', label: 'All Categories', count: typeWorks.length },
      ...categories.map((cat) => ({
        id: cat,
        label: cat,
        count: typeWorks.filter((w) => w.category === cat).length,
      })),
    ];
  }, [activeTab, works]);

  // Strictly filtered works for the active tab & category
  const filteredWorks = useMemo(() => {
    if (activeTab === 'write') return [];
    if (activeTab === 'home') {
      if (activeCategory === 'all') return works;
      return works.filter((w) => w.type === activeCategory);
    }
    const typeWorks = works.filter((w) => w.type === activeTab);
    if (activeCategory === 'all') return typeWorks;
    return typeWorks.filter((w) => w.category === activeCategory);
  }, [activeTab, activeCategory, works]);

  // Open Reader and accurately increment views in Supabase
  const handleOpenWork = useCallback((work: WorkItem) => {
    const nextViews = work.stats.views + 1;
    setWorks((prev) =>
      prev.map((w) =>
        w.id === work.id
          ? { ...w, stats: { ...w.stats, views: nextViews } }
          : w,
      ),
    );
    setReadingWorkId(work.id);
    void incrementWorkViewsInDb(work.id, nextViews);
  }, []);

  const handleToggleLike = useCallback(
    (workId: string) => {
      const currentlyLiked = Boolean(userLikes[workId]);
      const nextLiked = !currentlyLiked;
      setUserLikes((prev) => ({ ...prev, [workId]: nextLiked }));

      let nextLikes = 0;
      setWorks((prev) =>
        prev.map((w) => {
          if (w.id !== workId) return w;
          nextLikes = Math.max(0, w.stats.likes + (nextLiked ? 1 : -1));
          return {
            ...w,
            userLiked: nextLiked,
            stats: { ...w.stats, likes: nextLikes },
          };
        }),
      );
      void updateWorkLikesInDb(workId, nextLikes);
    },
    [userLikes],
  );

  const handleRateEpisode = useCallback(
    (
      workId: string,
      episodeId: string,
      episodeNumber: number,
      stars: number,
    ) => {
      const ratingKey = `${workId}:${episodeNumber}`;
      const prevRating = userEpisodeRatings[ratingKey] ?? 0;
      const hadPrev = prevRating > 0;
      setUserEpisodeRatings((prev) => ({ ...prev, [ratingKey]: stars }));

      let nextEpSum = 0;
      let nextEpCount = 0;

      setWorks((prev) =>
        prev.map((w) => {
          if (w.id !== workId) return w;
          const updatedEpisodes = w.episodes.map((ep) => {
            if (ep.id !== episodeId) return ep;
            nextEpSum = ep.ratingSum - prevRating + stars;
            nextEpCount = hadPrev ? ep.ratingCount : ep.ratingCount + 1;
            return {
              ...ep,
              ratingSum: nextEpSum,
              ratingCount: nextEpCount,
            };
          });

          const totalSum = updatedEpisodes.reduce(
            (acc, ep) => acc + ep.ratingSum,
            0,
          );
          const totalCount = updatedEpisodes.reduce(
            (acc, ep) => acc + ep.ratingCount,
            0,
          );

          return {
            ...w,
            episodes: updatedEpisodes,
            userEpisodeRatings: {
              ...(w.userEpisodeRatings ?? {}),
              [episodeNumber]: stars,
            },
            stats: {
              ...w.stats,
              ratingSum: totalSum,
              ratingCount: totalCount,
            },
          };
        }),
      );

      void updateEpisodeRatingInDb(episodeId, nextEpSum, nextEpCount);
    },
    [userEpisodeRatings],
  );

  const handleAddComment = useCallback(
    (workId: string, episodeNumber: number, author: string, text: string) => {
      const now = new Date().toISOString();
      const newComment = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workId,
        episodeNumber,
        author,
        text,
        createdAt: now,
      };

      let nextCommentsCount = 1;
      setWorks((prev) =>
        prev.map((w) => {
          if (w.id !== workId) return w;
          const nextComments = [newComment, ...w.comments];
          nextCommentsCount = Math.max(
            w.stats.commentsCount + 1,
            nextComments.length,
          );
          return {
            ...w,
            comments: nextComments,
            stats: {
              ...w.stats,
              commentsCount: nextCommentsCount,
            },
          };
        }),
      );

      void insertCommentAndSyncCountInDb(newComment, nextCommentsCount);
    },
    [],
  );

  const handleShareWork = useCallback((workId: string) => {
    let nextShares = 1;
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w;
        nextShares = w.stats.shares + 1;
        return {
          ...w,
          stats: { ...w.stats, shares: nextShares },
        };
      }),
    );
    void incrementWorkSharesInDb(workId, nextShares);
  }, []);

  // Private Drafts stay in localStorage on Admin's device
  const handleSaveDraft = useCallback((draft: DraftItem) => {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === draft.id);
      if (exists) {
        return prev.map((d) => (d.id === draft.id ? draft : d));
      }
      return [draft, ...prev];
    });
  }, []);

  const handleDeleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }, []);

  // Publish / Add Episode / Edit directly to Supabase
  const handlePublishWork = useCallback(
    async (payload: {
      draftId?: string;
      targetWorkId?: string;
      editingEpisodeId?: string;
      type: WorkType;
      category: string;
      coverUrl: string;
      description: string;
      title: string;
      episodeTitle: string;
      episodeNumber: number;
      rawContent: string;
    }) => {
      const now = new Date().toISOString();
      const pagesArray = splitPages(payload.rawContent);

      if (payload.targetWorkId) {
        if (payload.editingEpisodeId) {
          const existing = works.find((w) => w.id === payload.targetWorkId);
          const updatedTitle =
            existing && existing.episodes.length <= 1
              ? payload.episodeTitle
              : payload.title;

          await updateWorkAndEpisodeInDb({
            workId: payload.targetWorkId,
            title: updatedTitle,
            coverUrl: payload.coverUrl,
            description: payload.description,
            episodeId: payload.editingEpisodeId,
            episodeTitle: payload.episodeTitle,
            pages: pagesArray,
          });
        } else {
          const newEpisode = {
            id: `ep-${Date.now()}`,
            workId: payload.targetWorkId,
            episodeNumber: payload.episodeNumber,
            title: payload.episodeTitle,
            pages: pagesArray,
            rawContent: payload.rawContent,
            ratingSum: 0,
            ratingCount: 0,
            publishedAt: now,
          };

          await addEpisodeToWorkInDb(
            payload.targetWorkId,
            payload.coverUrl,
            payload.description,
            newEpisode,
          );
        }
      } else {
        const newWorkId = `work-${Date.now()}`;
        const newWork: WorkItem = {
          id: newWorkId,
          type: payload.type,
          category: payload.category,
          title: payload.title,
          description: payload.description,
          coverUrl: payload.coverUrl,
          writerName: writerProfile.name,
          episodes: [
            {
              id: `ep-${Date.now()}`,
              workId: newWorkId,
              episodeNumber: payload.episodeNumber,
              title: payload.episodeTitle,
              pages: pagesArray,
              rawContent: payload.rawContent,
              ratingSum: 0,
              ratingCount: 0,
              publishedAt: now,
            },
          ],
          stats: {
            views: 0,
            likes: 0,
            commentsCount: 0,
            shares: 0,
            ratingSum: 0,
            ratingCount: 0,
          },
          comments: [],
          createdAt: now,
          updatedAt: now,
        };

        await publishNewWorkToDb(newWork);
      }

      if (payload.draftId) {
        setDrafts((prev) => prev.filter((d) => d.id !== payload.draftId));
      }

      await syncFromSupabase();
    },
    [works, writerProfile.name, syncFromSupabase],
  );

  const handleEditWorkFromUi = useCallback(
    (work: WorkItem, episodeId?: string) => {
      setReadingWorkId(null);
      setWriteContext({ mode: 'edit-work', work, episodeId });
      setActiveTab('write');
    },
    [],
  );

  const handleAddEpisodeFromUi = useCallback((work: WorkItem) => {
    setReadingWorkId(null);
    setWriteContext({ mode: 'add-episode', work });
    setActiveTab('write');
  }, []);

  const handlePreviewDraft = useCallback(
    (draft: DraftItem) => {
      const pages = splitPages(draft.rawContent || 'No content written yet.');
      const previewItem: WorkItem = {
        id: draft.id,
        type: draft.type,
        category: draft.category,
        title: draft.title,
        description: draft.description || 'Draft Preview',
        coverUrl: draft.coverUrl,
        writerName: writerProfile.name,
        episodes: [
          {
            id: `preview-ep-${draft.id}`,
            workId: draft.id,
            episodeNumber: draft.episodeNumber,
            title: draft.title,
            pages,
            rawContent: draft.rawContent || 'No content written yet.',
            ratingSum: 0,
            ratingCount: 0,
            publishedAt: draft.updatedAt,
          },
        ],
        stats: {
          views: 0,
          likes: 0,
          commentsCount: 0,
          shares: 0,
          ratingSum: 0,
          ratingCount: 0,
        },
        comments: [],
        createdAt: draft.updatedAt,
        updatedAt: draft.updatedAt,
      };
      setPreviewDraftWork(previewItem);
    },
    [writerProfile.name],
  );

  const handleUpdateWriterProfile = useCallback(
    async (nextProfile: WriterProfile) => {
      await updateWriterProfileInDb(nextProfile);
      setWriterProfile(nextProfile);
      await syncFromSupabase();
    },
    [syncFromSupabase],
  );

  const handleChangeAdminPin = useCallback(async (newPin: string) => {
    await updateAdminPinInDb(newPin);
    setAdminPin(newPin);
  }, []);

  const handleResetSampleData = useCallback(async () => {
    await seedInitialSupabaseData();
    await syncFromSupabase();
  }, [syncFromSupabase]);

  const handleConfirmDeleteWork = async () => {
    if (!pendingDeleteWork) return;
    const targetId = pendingDeleteWork.id;
    setPendingDeleteWork(null);
    setWorks((prev) => prev.filter((w) => w.id !== targetId));
    try {
      await deleteWorkFromDb(targetId);
      await syncFromSupabase();
    } catch {
      await syncFromSupabase();
    }
  };

  const activeReadingWork = useMemo(
    () => works.find((w) => w.id === readingWorkId) ?? null,
    [works, readingWorkId],
  );

  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#070312] sm:py-3">
      {/* Centered Mobile-App Container (max-width: 430px) */}
      <div className="relative w-full max-w-[430px] h-dvh sm:h-[calc(100dvh-24px)] sm:rounded-[38px] sm:border sm:border-white/20 sm:shadow-[0_24px_80px_rgba(0,0,0,0.8)] cosmic-canvas overflow-hidden flex flex-col">
        <div className="cosmic-stars absolute inset-0 z-0" />

        {/* Top Header */}
        <div className="relative z-20">
          <TopHeader
            writerProfile={writerProfile}
            unreadNotifications={unreadCount}
            isAdminLoggedIn={isAdminLoggedIn}
            isInstalled={isInstalled}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSearch={() => setShowSearchModal(true)}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onInstallApp={() => void triggerInstall()}
          />

          {/* Horizontal Category Bar (hidden when inside Write tab) */}
          {activeTab !== 'write' && (
            <CategoryBar
              items={categoryPills}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
          )}
        </div>

        {/* Scrollable Main Content */}
        <main className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
          {activeTab === 'write' && isAdminLoggedIn ? (
            <WriteStudio
              works={works}
              drafts={drafts}
              initialContext={writeContext}
              onClearInitialContext={() => setWriteContext(null)}
              onSaveDraft={handleSaveDraft}
              onDeleteDraft={handleDeleteDraft}
              onPublishWork={handlePublishWork}
              onPreviewDraft={handlePreviewDraft}
            />
          ) : (
            <FeedView
              activeTab={activeTab === 'write' ? 'home' : activeTab}
              activeCategory={activeCategory}
              works={filteredWorks}
              allWorksCount={works.length}
              writerName={writerProfile.name}
              isAdminLoggedIn={isAdminLoggedIn}
              onOpenWork={handleOpenWork}
              onEditWork={(w) => handleEditWorkFromUi(w)}
              onAddEpisode={handleAddEpisodeFromUi}
              onDeleteWork={(w) => setPendingDeleteWork(w)}
              onGoToWrite={() => setActiveTab('write')}
            />
          )}
        </main>

        {/* Floating Bottom Glass Navigation Bar */}
        <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
      </div>

      {/* Full-Screen Reels Reader Popup */}
      {(activeReadingWork || previewDraftWork) && (
        <ReelsReaderModal
          work={(activeReadingWork || previewDraftWork)!}
          writerProfile={writerProfile}
          readerTheme={readerTheme}
          isAdminLoggedIn={isAdminLoggedIn}
          isPreview={Boolean(previewDraftWork)}
          onClose={() => {
            setReadingWorkId(null);
            setPreviewDraftWork(null);
          }}
          onChangeReaderTheme={setReaderTheme}
          onOpenWriterProfile={() => setShowProfileModal(true)}
          onToggleLike={handleToggleLike}
          onRateEpisode={handleRateEpisode}
          onAddComment={handleAddComment}
          onShareWork={handleShareWork}
          onEditWork={handleEditWorkFromUi}
          onAddEpisode={handleAddEpisodeFromUi}
        />
      )}

      {/* Strict Write Guard Alert */}
      {showAdminAlert && (
        <AdminLockAlert
          onClose={() => setShowAdminAlert(false)}
          onGoToSettings={() => {
            setShowAdminAlert(false);
            setShowSettingsModal(true);
          }}
        />
      )}

      {/* Writer Profile Modal */}
      {showProfileModal && (
        <WriterProfileModal
          profile={writerProfile}
          isAdminLoggedIn={isAdminLoggedIn}
          publishedCount={works.length}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={handleUpdateWriterProfile}
        />
      )}

      {/* Live Search Modal */}
      {showSearchModal && (
        <SearchModal
          works={works}
          writerName={writerProfile.name}
          isAdminLoggedIn={isAdminLoggedIn}
          onClose={() => setShowSearchModal(false)}
          onOpenWork={handleOpenWork}
        />
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          works={works}
          onClose={() => setShowNotificationsModal(false)}
          onOpenWork={handleOpenWork}
          onMarkAllRead={() =>
            setReadNotifIds((prev) =>
              Array.from(
                new Set([...prev, ...notifications.map((n) => n.id)]),
              ),
            )
          }
        />
      )}

      {/* Settings & Admin Access Modal */}
      {showSettingsModal && (
        <SettingsModal
          isAdminLoggedIn={isAdminLoggedIn}
          currentPin={adminPin}
          dbStatus={dbStatus}
          isInstalled={isInstalled}
          onClose={() => setShowSettingsModal(false)}
          onAdminLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            setShowSettingsModal(false);
          }}
          onAdminLogout={() => {
            setIsAdminLoggedIn(false);
            if (activeTab === 'write') {
              setActiveTab('home');
            }
          }}
          onChangeAdminPin={handleChangeAdminPin}
          onResetSampleData={handleResetSampleData}
          onRetrySync={syncFromSupabase}
          onInstallApp={() => void triggerInstall()}
        />
      )}

      {/* iOS / Fallback PWA Install Guide */}
      {showInstallGuide && <InstallGuideModal onClose={closeInstallGuide} />}

      {/* Admin Delete Confirmation Dialog */}
      {pendingDeleteWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-[340px] glass-panel rounded-3xl p-5 text-center space-y-4">
            <h3 className="font-display text-xl font-semibold text-white">
              Delete Published Work?
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently remove “
              {pendingDeleteWork.title}” from AYNORA UNIVERSE?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteWork(null)}
                className="min-h-[42px] rounded-full glass-pill text-xs font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWork}
                className="min-h-[42px] rounded-full bg-rose-500 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
