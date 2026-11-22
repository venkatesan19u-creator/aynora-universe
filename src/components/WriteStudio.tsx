import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BookPlus,
  Check,
  FileText,
  Layers,
  Plus,
  Scissors,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  CATEGORIES_BY_TYPE,
  DraftItem,
  PAGE_BREAK_MARKER,
  WorkItem,
  WorkType,
} from '../types';
import { uploadMediaToBucket } from '../lib/supabase';
import {
  autoCutText,
  getPageRanges,
  processImageFile,
  processImageToBlob,
  splitPages,
} from '../utils/storage';

export interface WriteInitialContext {
  mode: 'new' | 'add-episode' | 'edit-work';
  work?: WorkItem;
  episodeId?: string;
}

interface WriteStudioProps {
  works: WorkItem[];
  drafts: DraftItem[];
  initialContext: WriteInitialContext | null;
  onClearInitialContext: () => void;
  onSaveDraft: (draft: DraftItem) => void;
  onDeleteDraft: (draftId: string) => void;
  onPublishWork: (payload: {
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
  }) => Promise<void>;
  onPreviewDraft: (draft: DraftItem) => void;
  onOverlayChange?: (open: boolean) => void;
}

const DEFAULT_STUDIO_COVERS: Record<WorkType, string> = {
  story:
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#28164F"/><stop offset="100%" stop-color="#110926"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><circle cx="200" cy="240" r="90" fill="#F3DCB3" fill-opacity="0.15"/><rect x="24" y="24" width="352" height="552" rx="10" fill="none" stroke="#F3DCB3" stroke-opacity="0.35"/><text x="200" y="310" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="22" letter-spacing="3">AYNORA STORY</text></svg>`,
    ),
  novel:
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E1142"/><stop offset="100%" stop-color="#0C061C"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><circle cx="200" cy="210" r="65" fill="#F3DCB3" fill-opacity="0.22"/><rect x="24" y="24" width="352" height="552" rx="10" fill="none" stroke="#F3DCB3" stroke-opacity="0.35"/><text x="200" y="320" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="22" letter-spacing="3">AYNORA NOVEL</text></svg>`,
    ),
  poetry:
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2D154E"/><stop offset="100%" stop-color="#0E0720"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><circle cx="200" cy="240" r="95" fill="none" stroke="#F3DCB3" stroke-opacity="0.3"/><rect x="24" y="24" width="352" height="552" rx="10" fill="none" stroke="#F3DCB3" stroke-opacity="0.35"/><text x="200" y="310" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="22" letter-spacing="3">AYNORA POETRY</text></svg>`,
    ),
};

export function WriteStudio({
  works,
  drafts,
  initialContext,
  onClearInitialContext,
  onSaveDraft,
  onDeleteDraft,
  onPublishWork,
  onPreviewDraft,
  onOverlayChange,
}: WriteStudioProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  const [workType, setWorkType] = useState<WorkType>('story');
  const [category, setCategory] = useState<string>(CATEGORIES_BY_TYPE.story[0]);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [targetWorkId, setTargetWorkId] = useState<string | undefined>(undefined);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | undefined>(undefined);
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(undefined);
  const [hasCompletedStep2, setHasCompletedStep2] = useState<boolean>(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editorFeedback, setEditorFeedback] = useState<string | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    onOverlayChange?.(step === 2 || showDraftsModal);
    return () => {
      onOverlayChange?.(false);
    };
  }, [step, showDraftsModal, onOverlayChange]);

  const closeDraftsModal = () => {
    setShowDraftsModal(false);
    setDragOffsetY(0);
    setIsDraggingSheet(false);
    dragStartYRef.current = null;
  };

  const handleSheetDragStart = (clientY: number) => {
    dragStartYRef.current = clientY;
    setIsDraggingSheet(true);
  };

  const handleSheetDragMove = (clientY: number) => {
    if (dragStartYRef.current === null) return;
    const delta = Math.max(0, clientY - dragStartYRef.current);
    setDragOffsetY(delta);
  };

  const handleSheetDragEnd = () => {
    if (dragStartYRef.current === null) return;
    if (dragOffsetY > 85) {
      closeDraftsModal();
    } else {
      setDragOffsetY(0);
      setIsDraggingSheet(false);
      dragStartYRef.current = null;
    }
  };

  // Sync external context (Add Episode / Edit Work)
  useEffect(() => {
    if (!initialContext) return;
    const { mode, work, episodeId } = initialContext;
    if (mode === 'add-episode' && work) {
      setWorkType(work.type);
      setCategory(work.category);
      setCoverUrl(work.coverUrl);
      setDescription(work.description);
      setTargetWorkId(work.id);
      setEditingEpisodeId(undefined);
      setActiveDraftId(undefined);
      const nextEp = work.episodes.length + 1;
      setEpisodeNumber(nextEp);
      setNoteTitle(`Episode ${nextEp}`);
      setRawContent('');
      setHasCompletedStep2(false);
      setStep(2);
    } else if (mode === 'edit-work' && work) {
      const targetEp =
        work.episodes.find((ep) => ep.id === episodeId) ?? work.episodes[0];
      setWorkType(work.type);
      setCategory(work.category);
      setCoverUrl(work.coverUrl);
      setDescription(work.description);
      setTargetWorkId(work.id);
      setEditingEpisodeId(targetEp?.id);
      setActiveDraftId(undefined);
      setEpisodeNumber(targetEp?.episodeNumber ?? 1);
      setNoteTitle(
        work.episodes.length > 1 ? targetEp?.title || work.title : work.title,
      );
      setRawContent(targetEp?.rawContent ?? '');
      setHasCompletedStep2(true);
      setStep(1);
    }
    onClearInitialContext();
  }, [initialContext, onClearInitialContext]);

  const categoriesForType = CATEGORIES_BY_TYPE[workType];
  const pages = splitPages(rawContent);
  const pageCount = rawContent.trim() ? pages.length : 0;

  const handleSelectType = (nextType: WorkType) => {
    setWorkType(nextType);
    const allowed = CATEGORIES_BY_TYPE[nextType];
    if (!allowed.includes(category)) {
      setCategory(allowed[0]);
    }
    setErrorMessage(null);
  };

  const handleTargetWorkSelection = (selectedId: string) => {
    if (!selectedId) {
      setTargetWorkId(undefined);
      setEditingEpisodeId(undefined);
      setEpisodeNumber(1);
      return;
    }
    const existing = works.find((w) => w.id === selectedId);
    if (!existing) return;
    setTargetWorkId(existing.id);
    setEditingEpisodeId(undefined);
    setWorkType(existing.type);
    setCategory(existing.category);
    setCoverUrl(existing.coverUrl);
    setDescription(existing.description);
    const nextEp = existing.episodes.length + 1;
    setEpisodeNumber(nextEp);
    if (!noteTitle.trim()) {
      setNoteTitle(`Episode ${nextEp}`);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setErrorMessage(null);
    try {
      const blob = await processImageToBlob(file, 500, 750);
      try {
        const publicUrl = await uploadMediaToBucket(blob, 'covers');
        setCoverUrl(publicUrl);
        setStatusMessage('2:3 Cover uploaded to Supabase Storage.');
        setTimeout(() => setStatusMessage(null), 2400);
      } catch {
        const fallbackDataUrl = await processImageFile(file, 500, 750);
        setCoverUrl(fallbackDataUrl);
        setErrorMessage(
          'Storage bucket not ready — using local preview. Run SQL setup to enable cloud cover storage.',
        );
      }
    } catch {
      setErrorMessage(
        'Could not process that image. Please choose a valid image file.',
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleContinueFromStep1 = () => {
    if (!category) {
      setErrorMessage('Please select a category.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please enter a short description for your work.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const pageRanges = getPageRanges(rawContent);
  const safeActivePageIndex = Math.min(
    activePageIndex,
    Math.max(0, pageRanges.length - 1),
  );

  const syncActivePageFromCursor = () => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const foundIdx = pageRanges.findIndex(
      (range, idx) =>
        caret <= range.end || idx === pageRanges.length - 1,
    );
    if (foundIdx !== -1 && foundIdx !== activePageIndex) {
      setActivePageIndex(foundIdx);
    }
  };

  const handleCutPage = () => {
    const el = textareaRef.current;
    const insertion = `\n\n${PAGE_BREAK_MARKER}\n\n`;
    setErrorMessage(null);
    if (!el) {
      setRawContent((prev) => `${prev}${insertion}`);
      return;
    }
    const start = el.selectionStart ?? rawContent.length;
    const end = el.selectionEnd ?? rawContent.length;
    const next =
      rawContent.slice(0, start) + insertion + rawContent.slice(end);
    setRawContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
      const nextRanges = getPageRanges(next);
      const nextIdx = nextRanges.findIndex((r) => pos >= r.start && pos <= r.end);
      if (nextIdx !== -1) {
        setActivePageIndex(nextIdx);
      }
    });
  };

  const handleAutoCut = () => {
    if (!rawContent.trim()) {
      setErrorMessage(
        'Write or paste your content first before using Auto Cut.',
      );
      return;
    }
    setErrorMessage(null);
    const next = autoCutText(rawContent);
    setRawContent(next);
    setActivePageIndex(0);
    const totalGenerated = splitPages(next).length;
    setEditorFeedback(
      `Auto-split into ${totalGenerated} ${totalGenerated === 1 ? 'page' : 'pages'}.`,
    );
    window.setTimeout(() => {
      setEditorFeedback((prev) =>
        prev?.startsWith('Auto-split into') ? null : prev,
      );
    }, 2800);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      chipRefs.current[0]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    });
  };

  const handleJumpToPage = (pageIdx: number) => {
    const range = pageRanges[pageIdx];
    if (!range) return;
    setActivePageIndex(pageIdx);
    chipRefs.current[pageIdx]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });

    const el = textareaRef.current;
    if (!el) return;

    // Measure exact vertical pixel offset inside the textarea before focusing/selecting
    const style = window.getComputedStyle(el);
    const mirror = document.createElement('div');
    mirror.style.position = 'fixed';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.top = '-9999px';
    mirror.style.left = '-9999px';
    mirror.style.boxSizing = style.boxSizing;
    mirror.style.width = `${el.clientWidth}px`;
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-word';

    mirror.textContent = rawContent.slice(0, range.start);
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const targetTop = Math.max(0, marker.offsetTop - 14);
    document.body.removeChild(mirror);

    el.focus({ preventScroll: true });
    el.setSelectionRange(range.start, range.end);
    requestAnimationFrame(() => {
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  };

  const handleAddEpisodeInEditor = () => {
    if (targetWorkId) {
      const existing = works.find((w) => w.id === targetWorkId);
      if (existing) {
        setEpisodeNumber(existing.episodes.length + 1);
        setEditingEpisodeId(undefined);
        return;
      }
    }
    setEpisodeNumber((prev) => prev + 1);
  };

  const handleContinueFromStep2 = () => {
    if (!noteTitle.trim()) {
      setErrorMessage('Please enter a Title / Heading before continuing.');
      return;
    }
    if (!rawContent.trim()) {
      setErrorMessage('Please write your content before continuing.');
      return;
    }
    setErrorMessage(null);
    setHasCompletedStep2(true);
    setStep(1);
  };

  const resetStudio = () => {
    setWorkType('story');
    setCategory(CATEGORIES_BY_TYPE.story[0]);
    setCoverUrl('');
    setDescription('');
    setNoteTitle('');
    setRawContent('');
    setEpisodeNumber(1);
    setTargetWorkId(undefined);
    setEditingEpisodeId(undefined);
    setActiveDraftId(undefined);
    setHasCompletedStep2(false);
    setActivePageIndex(0);
    setEditorFeedback(null);
    setStep(1);
  };

  const handleSaveToDrafts = () => {
    if (!noteTitle.trim() && !description.trim()) {
      setErrorMessage('Add a title or description before saving to Drafts.');
      return;
    }
    const draft: DraftItem = {
      id: activeDraftId ?? `draft-${Date.now()}`,
      type: workType,
      category,
      title: noteTitle.trim() || 'Untitled Draft',
      description: description.trim(),
      coverUrl: coverUrl || DEFAULT_STUDIO_COVERS[workType],
      rawContent,
      episodeNumber,
      targetWorkId,
      editingEpisodeId,
      updatedAt: new Date().toISOString(),
    };
    onSaveDraft(draft);
    setActiveDraftId(draft.id);
    setStatusMessage('Saved to Drafts.');
    setTimeout(() => setStatusMessage(null), 2600);
  };

  const handlePublish = async () => {
    if (!noteTitle.trim() || !rawContent.trim() || isPublishing) {
      if (!noteTitle.trim() || !rawContent.trim()) {
        setErrorMessage('Title and written content are required to publish.');
      }
      return;
    }
    const finalCover = coverUrl || DEFAULT_STUDIO_COVERS[workType];
    const targetWork = targetWorkId
      ? works.find((w) => w.id === targetWorkId)
      : undefined;

    setIsPublishing(true);
    setErrorMessage(null);
    try {
      await onPublishWork({
        draftId: activeDraftId,
        targetWorkId,
        editingEpisodeId,
        type: workType,
        category,
        coverUrl: finalCover,
        description: description.trim() || noteTitle.trim(),
        title: targetWork ? targetWork.title : noteTitle.trim(),
        episodeTitle: noteTitle.trim(),
        episodeNumber,
        rawContent,
      });

      setStatusMessage(
        targetWorkId
          ? editingEpisodeId
            ? 'Work updated live on Supabase!'
            : `Episode ${episodeNumber} published live!`
          : 'Published live to AYNORA UNIVERSE!',
      );
      resetStudio();
      setTimeout(() => setStatusMessage(null), 3200);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Publish failed: ${err.message}`
          : 'Failed to publish to Supabase. Please check your SQL setup.',
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLoadDraft = (draft: DraftItem) => {
    setWorkType(draft.type);
    setCategory(draft.category);
    setCoverUrl(draft.coverUrl);
    setDescription(draft.description);
    setNoteTitle(draft.title);
    setRawContent(draft.rawContent);
    setEpisodeNumber(draft.episodeNumber);
    setTargetWorkId(draft.targetWorkId);
    setEditingEpisodeId(draft.editingEpisodeId);
    setActiveDraftId(draft.id);
    setHasCompletedStep2(true);
    setActivePageIndex(0);
    setEditorFeedback(null);
    closeDraftsModal();
    setStep(1);
  };

  // STEP 2: FULL-SCREEN NOTE EDITOR
  if (step === 2) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex justify-center bg-[#090415]/90 backdrop-blur-xl">
        <div className="w-full max-w-[430px] h-dvh flex flex-col cosmic-canvas relative overflow-hidden">
          <div className="cosmic-stars absolute inset-0" />

          {/* Editor Header */}
          <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-3.5 py-3 border-b border-white/10 bg-[#140B2D]/85 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStep(1);
              }}
              className="min-h-[40px] px-2.5 rounded-full glass-pill text-white/90 text-xs font-medium flex items-center gap-1 active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-[#F3DCB3]/20 border border-[#F3DCB3]/40 text-[#F3DCB3] text-[11px] font-semibold tabular-nums">
                Episode {episodeNumber}
              </span>
              <span className="px-2.5 py-1 rounded-full glass-pill text-white/90 text-[11px] font-medium tabular-nums">
                {Math.max(1, pageCount)} {Math.max(1, pageCount) === 1 ? 'Page' : 'Pages'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddEpisodeInEditor}
              className="min-h-[36px] px-2.5 rounded-full glass-pill text-[#F3DCB3] text-[11px] font-semibold flex items-center gap-1 hover:bg-white/15 active:scale-95 transition"
              title="Increment episode number"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Episode</span>
            </button>
          </div>

          {/* Note Editor Canvas */}
          <div className="relative z-10 flex-1 flex flex-col p-3.5 pb-28 gap-3 overflow-y-auto no-scrollbar">
            <div>
              <label className="block text-[11px] font-medium text-[#F3DCB3]/85 mb-1">
                {targetWorkId && !editingEpisodeId
                  ? `Episode ${episodeNumber} Heading`
                  : 'Title / Heading'}
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter Title / Heading..."
                className="w-full px-3.5 py-2.5 rounded-2xl glass-panel text-white placeholder:text-white/40 text-[15px] font-literary font-semibold focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/60"
              />
            </div>

            {/* Cut Page & Auto Cut Toolbar */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCutPage}
                  className="min-h-[40px] px-3.5 py-2 rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition whitespace-nowrap"
                >
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <span>✂️ Cut Page</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoCut}
                  className="min-h-[40px] px-3.5 py-2 rounded-full glass-pill border border-[#F3DCB3]/45 text-[#F3DCB3] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#F3DCB3]/15 active:scale-95 transition whitespace-nowrap"
                  title="Automatically split text into comfortable reader pages"
                >
                  <Wand2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto Cut</span>
                </button>
              </div>

              <p className="text-[11px] text-white/65 tabular-nums px-1">
                {editorFeedback ? (
                  <span className="text-emerald-300 font-medium">
                    {editorFeedback}
                  </span>
                ) : (
                  'Creates Reels-style page breaks'
                )}
              </p>
            </div>

            {/* Main Writing Area */}
            <textarea
              ref={textareaRef}
              value={rawContent}
              onChange={(e) => {
                setRawContent(e.target.value);
                if (errorMessage) setErrorMessage(null);
                if (editorFeedback) setEditorFeedback(null);
              }}
              onClick={syncActivePageFromCursor}
              onKeyUp={syncActivePageFromCursor}
              placeholder="Write your story, novel chapter, or poetry here... Tap 'Cut Page' manually or 'Auto Cut' to split into balanced vertical reading pages."
              className="flex-1 min-h-[210px] w-full p-4 rounded-2xl glass-panel text-white/95 placeholder:text-white/40 text-[15px] leading-relaxed font-literary resize-none focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/50"
            />

            {/* Live Interactive Page Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar py-1">
              {(pageCount > 0 ? pages : ['']).map((_, idx) => {
                const isSelected = idx === safeActivePageIndex;
                return (
                  <button
                    key={`pg-ind-${idx}`}
                    ref={(el) => {
                      chipRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => handleJumpToPage(idx)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium tabular-nums transition active:scale-95 ${
                      isSelected
                        ? 'bg-[#F3DCB3] text-[#1A1033] font-bold shadow-[0_2px_10px_rgba(243,220,179,0.35)]'
                        : 'glass-pill text-[#F3DCB3] hover:bg-white/15'
                    }`}
                  >
                    Page {idx + 1}
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Back & Prominent Glowing Cream-Gold Continue Buttons right below Page Badge */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep(1);
                }}
                className="min-h-[46px] px-5 rounded-full glass-pill text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-white/15 active:scale-95 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleContinueFromStep2}
                className="flex-1 min-h-[46px] rounded-full bg-[#F3DCB3] text-[#1A1033] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(243,220,179,0.45)] hover:brightness-105 active:scale-[0.98] transition"
              >
                <span>Continue</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // STEP 1: SETUP VIEW (MATCHING WRITE SCREEN MOCKUP)
  return (
    <div className="px-4 pt-3 pb-28 space-y-4">
      {/* Write Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-[#F3DCB3] leading-tight">
            Write
          </h1>
          {targetWorkId && (
            <p className="text-[11px] text-[#F3DCB3]/80">
              {editingEpisodeId
                ? `Editing Episode ${episodeNumber}`
                : `Adding Episode ${episodeNumber} to existing work`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(targetWorkId || hasCompletedStep2) && (
            <button
              type="button"
              onClick={resetStudio}
              className="min-h-[36px] px-3 rounded-full glass-pill text-xs text-white/80 hover:text-white active:scale-95 transition"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="min-h-[38px] px-3.5 rounded-full glass-pill text-[#F3DCB3] text-xs font-medium flex items-center gap-1.5 hover:bg-white/15 active:scale-95 transition"
          >
            <FileText className="w-4 h-4" />
            <span>Drafts</span>
            {drafts.length > 0 && (
              <span className="tabular-nums text-[11px] text-white/90">
                ({drafts.length})
              </span>
            )}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Optional: Add Episode to Existing Work Selector */}
      {works.length > 0 && !editingEpisodeId && (
        <div className="glass-panel rounded-2xl p-2.5 flex items-center gap-2">
          <BookPlus className="w-4 h-4 text-[#F3DCB3] shrink-0 ml-1" />
          <select
            aria-label="Target work mode"
            value={targetWorkId ?? ''}
            onChange={(e) => handleTargetWorkSelection(e.target.value)}
            className="w-full bg-transparent text-xs text-white/90 focus:outline-none"
          >
            <option value="" className="bg-[#1B1038] text-white">
              Create New Work (Episode 1)
            </option>
            {works.map((w) => (
              <option key={w.id} value={w.id} className="bg-[#1B1038] text-white">
                + Add Episode {w.episodes.length + 1} to: {w.title} ({w.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Top Selector Pills: Story | Novel | Poetry */}
      <div className="grid grid-cols-3 gap-2.5">
        {(['story', 'novel', 'poetry'] as WorkType[]).map((type) => {
          const isActive = workType === type;
          return (
            <button
              key={type}
              type="button"
              disabled={Boolean(targetWorkId)}
              onClick={() => handleSelectType(type)}
              className={`min-h-[42px] rounded-full text-sm font-medium capitalize transition-all active:scale-95 ${
                isActive
                  ? 'bg-[#F3DCB3] text-[#1A1033] font-semibold shadow-[0_6px_18px_rgba(243,220,179,0.28)]'
                  : 'glass-panel text-white/90 hover:bg-white/15'
              } ${targetWorkId ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Categories Dropdown */}
      <div>
        <label
          htmlFor="write-category"
          className="block text-[14px] font-medium text-[#F3DCB3] mb-1.5"
        >
          Categories
        </label>
        <div className="relative">
          <select
            id="write-category"
            disabled={Boolean(targetWorkId)}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full min-h-[44px] px-4 rounded-full glass-panel text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/60 appearance-none"
          >
            {categoriesForType.map((cat) => (
              <option key={cat} value={cat} className="bg-[#1B1038] text-white">
                {cat}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/70 text-xs">
            ▾
          </span>
        </div>
      </div>

      {/* Add Image (Strict 2:3 Portrait Ratio) */}
      <div>
        <span className="block text-[14px] font-medium text-[#F3DCB3] mb-1.5">
          Add Image <span className="text-[11px] text-white/60">(2:3 Cover)</span>
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />
        <button
          type="button"
          disabled={isUploadingCover}
          onClick={() => fileInputRef.current?.click()}
          className="group relative w-[124px] aspect-[2/3] rounded-2xl glass-panel overflow-hidden flex flex-col items-center justify-center gap-1.5 hover:border-[#F3DCB3]/50 active:scale-[0.98] transition"
        >
          {coverUrl ? (
            <>
              <img
                src={coverUrl}
                alt="Book cover preview"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 py-1.5 bg-black/65 text-[10px] text-[#F3DCB3] font-medium text-center">
                {isUploadingCover ? 'Uploading...' : 'Change Cover'}
              </span>
            </>
          ) : (
            <>
              <Plus className="w-7 h-7 text-[#F3DCB3]/85 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] text-white/65">
                {isUploadingCover ? 'Uploading...' : '2:3 Cover'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Description Box */}
      <div>
        <label
          htmlFor="write-description"
          className="block text-[14px] font-medium text-[#F3DCB3] mb-1.5"
        >
          Description
        </label>
        <textarea
          id="write-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write a compelling synopsis for your readers..."
          className="w-full p-3.5 rounded-2xl glass-panel text-white placeholder:text-white/40 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/60 resize-none"
        />
      </div>

      {/* Summary Card directly below Description box after returning from Step 2 */}
      {hasCompletedStep2 && (
        <div className="glass-panel rounded-2xl p-3.5 border border-[#F3DCB3]/35 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#F3DCB3]">
                <span className="px-2 py-0.5 rounded-full bg-[#F3DCB3]/15 border border-[#F3DCB3]/30 tabular-nums">
                  Episode {episodeNumber}
                </span>
                <span className="flex items-center gap-1 text-white/80 tabular-nums">
                  <Layers className="w-3 h-3 text-[#F3DCB3]" />
                  {Math.max(1, pageCount)}{' '}
                  {Math.max(1, pageCount) === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
              <h3 className="font-literary text-[16px] font-semibold text-white mt-1.5 truncate">
                {noteTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="shrink-0 px-2.5 py-1 rounded-full glass-pill text-[11px] text-[#F3DCB3] hover:bg-white/15 transition"
            >
              Edit Note
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleSaveToDrafts}
              className="min-h-[42px] rounded-full glass-pill text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/15 active:scale-95 transition"
            >
              <FileText className="w-3.5 h-3.5 text-[#F3DCB3]" />
              <span>Save to Drafts</span>
            </button>

            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="min-h-[42px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(243,220,179,0.3)] active:scale-95 transition disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Continue Button (bottom right, matching Write mockup) */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleContinueFromStep1}
          className="min-h-[44px] px-6 rounded-full glass-panel border border-[#F3DCB3]/35 text-[#F3DCB3] text-sm font-medium hover:bg-[#F3DCB3] hover:text-[#1A1033] active:scale-95 transition"
        >
          {hasCompletedStep2 ? 'Edit Content' : 'Continue'}
        </button>
      </div>

      {/* Drafts Bottom Sheet Modal (portaled above BottomNav with pull-down to close) */}
      {showDraftsModal &&
        createPortal(
          <div
            onClick={closeDraftsModal}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-2.5 pt-10 pb-2 sm:p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `translateY(${dragOffsetY}px)`,
              }}
              className={`w-full max-w-[416px] max-h-[84dvh] flex flex-col overflow-hidden glass-panel rounded-t-[28px] sm:rounded-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.65)] ${
                isDraggingSheet ? '' : 'transition-transform duration-200'
              }`}
            >
              {/* Drag Handle + Header (swipe down to close) */}
              <div
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    handleSheetDragStart(e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) {
                    handleSheetDragMove(e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handleSheetDragEnd}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse') {
                    handleSheetDragStart(e.clientY);
                  }
                }}
                onPointerMove={(e) => {
                  if (e.pointerType === 'mouse' && isDraggingSheet) {
                    handleSheetDragMove(e.clientY);
                  }
                }}
                onPointerUp={handleSheetDragEnd}
                onPointerCancel={handleSheetDragEnd}
                className="shrink-0 select-none touch-none px-4 pt-2.5 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing"
              >
                <div className="mx-auto mb-2.5 h-1.5 w-11 rounded-full bg-white/30" />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-[#F3DCB3]">
                      Saved Drafts ({drafts.length})
                    </h2>
                    <p className="text-[11px] text-white/55">
                      Swipe down from header or tap close to dismiss
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Saved Drafts"
                    onClick={closeDraftsModal}
                    className="min-w-[36px] min-h-[36px] px-3 rounded-full glass-pill text-xs font-medium text-white/90 flex items-center gap-1 hover:bg-white/15 active:scale-95 transition"
                  >
                    <X className="w-4 h-4" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Drafts List */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-6 space-y-3">
                {drafts.length === 0 ? (
                  <p className="text-center text-xs text-white/65 py-10">
                    No saved drafts yet. Write content and tap “Save to Drafts”.
                  </p>
                ) : (
                  drafts.map((draft) => {
                    const pgCount = splitPages(draft.rawContent).length;
                    return (
                      <div
                        key={draft.id}
                        className="rounded-2xl bg-white/[0.06] border border-white/12 p-3 flex gap-3"
                      >
                        <img
                          src={draft.coverUrl}
                          alt={draft.title}
                          className="w-14 aspect-[2/3] rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10.5px] text-[#F3DCB3] capitalize">
                            {draft.type} · {draft.category} · Ep {draft.episodeNumber}
                          </p>
                          <h3 className="font-literary text-sm font-semibold text-white truncate mt-0.5">
                            {draft.title}
                          </h3>
                          <p className="text-[11px] text-white/60 tabular-nums">
                            {pgCount} {pgCount === 1 ? 'Page' : 'Pages'}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <button
                              type="button"
                              onClick={() => handleLoadDraft(draft)}
                              className="min-h-[34px] px-3 rounded-full bg-white/12 text-[11.5px] font-medium text-white hover:bg-white/20 active:scale-95 transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onPreviewDraft(draft)}
                              className="min-h-[34px] px-3 rounded-full bg-white/12 text-[11.5px] font-medium text-[#F3DCB3] hover:bg-white/20 active:scale-95 transition"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              disabled={isPublishing}
                              onClick={async () => {
                                setIsPublishing(true);
                                try {
                                  await onPublishWork({
                                    draftId: draft.id,
                                    targetWorkId: draft.targetWorkId,
                                    editingEpisodeId: draft.editingEpisodeId,
                                    type: draft.type,
                                    category: draft.category,
                                    coverUrl: draft.coverUrl,
                                    description: draft.description,
                                    title: draft.title,
                                    episodeTitle: draft.title,
                                    episodeNumber: draft.episodeNumber,
                                    rawContent: draft.rawContent,
                                  });
                                  closeDraftsModal();
                                } catch (err) {
                                  setErrorMessage(
                                    err instanceof Error
                                      ? err.message
                                      : 'Failed to publish draft.',
                                  );
                                } finally {
                                  setIsPublishing(false);
                                }
                              }}
                              className="min-h-[34px] px-3.5 rounded-full bg-[#F3DCB3] text-[#1A1033] text-[11.5px] font-bold hover:brightness-105 active:scale-95 transition disabled:opacity-60"
                            >
                              {isPublishing ? '...' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteDraft(draft.id)}
                              aria-label="Delete draft"
                              className="ml-auto min-w-[34px] min-h-[34px] rounded-full text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center active:scale-95 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
