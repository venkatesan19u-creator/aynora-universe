import { useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Download,
  KeyRound,
  Lock,
  LogOut,
  RotateCcw,
  Search,
  Share,
  ShieldCheck,
  Smartphone,
  UserCheck,
  X,
} from 'lucide-react';
import { uploadMediaToBucket } from '../lib/supabase';
import { NotificationItem, WorkItem, WriterProfile } from '../types';
import { processImageFile, processImageToBlob } from '../utils/storage';
import { BookCard } from './BookCard';

/* -------------------------------------------------------------------------- */
/* 1. Admin Lock Alert Popup ("This is used only by Admin")                    */
/* -------------------------------------------------------------------------- */
interface AdminLockAlertProps {
  onClose: () => void;
  onGoToSettings: () => void;
}

export function AdminLockAlert({
  onClose,
  onGoToSettings,
}: AdminLockAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-[340px] glass-panel rounded-3xl p-5 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F3DCB3]/20 border border-[#F3DCB3]/40 flex items-center justify-center">
          <Lock className="w-6 h-6 text-[#F3DCB3]" />
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold text-white">
            Restricted Access
          </h3>
          <p className="text-sm text-[#F3DCB3] font-medium mt-1.5">
            This is used only by Admin
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-full glass-pill text-xs font-medium text-white hover:bg-white/15 active:scale-95 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onGoToSettings}
            className="min-h-[42px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold active:scale-95 transition"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Writer Profile Modal                                                     */
/* -------------------------------------------------------------------------- */
interface WriterProfileModalProps {
  profile: WriterProfile;
  isAdminLoggedIn: boolean;
  publishedCount: number;
  onClose: () => void;
  onUpdateProfile: (next: WriterProfile) => Promise<void>;
}

export function WriterProfileModal({
  profile,
  isAdminLoggedIn,
  publishedCount,
  onClose,
  onUpdateProfile,
}: WriterProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setProfileError(null);
    try {
      const blob = await processImageToBlob(file, 320, 320);
      try {
        const publicUrl = await uploadMediaToBucket(blob, 'avatars');
        setPhotoUrl(publicUrl);
      } catch {
        const fallback = await processImageFile(file, 320, 320);
        setPhotoUrl(fallback);
      }
    } catch {
      setProfileError('Could not process that image file.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await onUpdateProfile({
        ...profile,
        name: name.trim() || profile.name,
        bio: bio.trim() || profile.bio,
        photoUrl,
      });
      setIsEditing(false);
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : 'Failed to save profile to Supabase.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] glass-panel rounded-3xl p-5 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Writer Profile"
          className="absolute top-3.5 right-3.5 min-w-[36px] min-h-[36px] rounded-full glass-pill flex items-center justify-center text-white/85"
        >
          <X className="w-4 h-4" />
        </button>

        {!isEditing ? (
          <div className="text-center space-y-3.5 pt-2">
            <div className="relative w-24 h-24 mx-auto">
              <img
                src={profile.photoUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-2 border-[#F3DCB3]/70 shadow-lg"
              />
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                {profile.name}
              </h2>
              <p className="text-xs font-semibold text-[#F3DCB3] mt-0.5">
                {profile.ownershipLabel}
              </p>
              <p className="text-[11px] text-white/65 mt-1 tabular-nums">
                {publishedCount} Published Works
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-left">
              <p className="text-[13px] leading-relaxed text-white/90 font-literary">
                {profile.bio}
              </p>
            </div>

            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full min-h-[44px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold active:scale-95 transition"
              >
                Edit Writer Profile
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <h2 className="font-display text-xl font-semibold text-[#F3DCB3]">
              Edit Writer Profile
            </h2>

            <div className="flex items-center gap-3">
              <img
                src={photoUrl}
                alt="Writer avatar preview"
                className="w-16 h-16 rounded-full object-cover border border-[#F3DCB3]/60"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileRef.current?.click()}
                className="min-h-[38px] px-3.5 rounded-full glass-pill text-xs font-medium text-[#F3DCB3] flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
              </button>
            </div>

            {profileError && (
              <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs">
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#F3DCB3] mb-1">
                Writer Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/50"
              />
            </div>

            <div>
              <label className="block text-xs text-[#F3DCB3] mb-1">
                Writer Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-2xl bg-white/10 border border-white/15 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[42px] rounded-full glass-pill text-xs font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="min-h-[42px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Live Search Modal                                                        */
/* -------------------------------------------------------------------------- */
interface SearchModalProps {
  works: WorkItem[];
  writerName: string;
  isAdminLoggedIn: boolean;
  onClose: () => void;
  onOpenWork: (work: WorkItem) => void;
}

export function SearchModal({
  works,
  writerName,
  isAdminLoggedIn,
  onClose,
  onOpenWork,
}: SearchModalProps) {
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? works.filter(
        (w) =>
          w.title.toLowerCase().includes(trimmed) ||
          w.category.toLowerCase().includes(trimmed) ||
          w.type.toLowerCase().includes(trimmed),
      )
    : works;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-[430px] h-dvh flex flex-col cosmic-canvas relative">
        <div className="cosmic-stars absolute inset-0" />

        <div className="relative z-10 p-3.5 border-b border-white/10 bg-[#140B2D]/85 backdrop-blur-xl flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3.5 min-h-[44px] rounded-full glass-panel">
            <Search className="w-4 h-4 text-[#F3DCB3] shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Novels, Stories, Poetry by title..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3 rounded-full glass-pill text-xs font-medium text-white"
          >
            Cancel
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-3.5">
          <p className="text-xs text-[#F3DCB3]/85 mb-3 tabular-nums">
            {matches.length} {matches.length === 1 ? 'result' : 'results'} found
          </p>

          {matches.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center">
              <p className="text-sm text-white/85">
                No matching titles found for “{query}”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-10">
              {matches.map((work) => (
                <BookCard
                  key={work.id}
                  work={work}
                  writerName={writerName}
                  isAdminLoggedIn={isAdminLoggedIn}
                  onOpen={(selected) => {
                    onClose();
                    onOpenWork(selected);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Notifications Modal                                                      */
/* -------------------------------------------------------------------------- */
interface NotificationsModalProps {
  notifications: NotificationItem[];
  works: WorkItem[];
  onClose: () => void;
  onOpenWork: (work: WorkItem) => void;
  onMarkAllRead: () => void;
}

export function NotificationsModal({
  notifications,
  works,
  onClose,
  onOpenWork,
  onMarkAllRead,
}: NotificationsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-3">
      <div className="w-full max-w-[400px] max-h-[75vh] flex flex-col glass-panel rounded-3xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#F3DCB3]" />
            <h2 className="font-display text-xl font-semibold text-white">
              Notifications
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[11px] font-medium text-[#F3DCB3] hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="min-w-[34px] min-h-[34px] rounded-full glass-pill flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-xs text-white/60 py-8">
              No publication alerts yet.
            </p>
          ) : (
            notifications.map((notif) => {
              const targetWork = works.find((w) => w.id === notif.workId);
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    if (targetWork) {
                      onClose();
                      onOpenWork(targetWork);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition ${
                    notif.read
                      ? 'bg-white/5 border-white/10 text-white/80'
                      : 'bg-[#F3DCB3]/12 border-[#F3DCB3]/35 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F3DCB3]">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-white/50 tabular-nums">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-snug">{notif.message}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Settings & Admin Access Modal                                            */
/* -------------------------------------------------------------------------- */
interface SettingsModalProps {
  isAdminLoggedIn: boolean;
  currentPin: string;
  dbStatus: 'loading' | 'connected' | 'missing_schema' | 'error';
  isInstalled: boolean;
  onClose: () => void;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
  onChangeAdminPin: (newPin: string) => Promise<void>;
  onResetSampleData: () => Promise<void>;
  onRetrySync: () => Promise<void>;
  onInstallApp: () => void;
}

export function SettingsModal({
  isAdminLoggedIn,
  currentPin,
  dbStatus,
  isInstalled,
  onClose,
  onAdminLoginSuccess,
  onAdminLogout,
  onChangeAdminPin,
  onResetSampleData,
  onRetrySync,
  onInstallApp,
}: SettingsModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === currentPin) {
      setError(null);
      setPinInput('');
      onAdminLoginSuccess();
    } else {
      setError('Incorrect Admin PIN. Please try again.');
    }
  };

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setError('New PIN must be at least 4 characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setIsBusy(true);
    try {
      await onChangeAdminPin(newPin.trim());
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setFeedback('Admin PIN updated in Supabase.');
      setTimeout(() => setFeedback(null), 2600);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update PIN in Supabase.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] glass-panel rounded-3xl p-5 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Settings"
          className="absolute top-3.5 right-3.5 min-w-[36px] min-h-[36px] rounded-full glass-pill flex items-center justify-center text-white/85"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            Settings
          </h2>
          <p className="text-xs text-white/65">
            Admin Access & Publication Controls
          </p>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs">
            {error}
          </div>
        )}

        {feedback && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs">
            {feedback}
          </div>
        )}

        {/* Prominent Glowing Cream-Gold Install App Button (hidden when already installed) */}
        {!isInstalled && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onInstallApp();
            }}
            className="w-full min-h-[46px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(243,220,179,0.45)] hover:brightness-105 active:scale-[0.98] transition"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}

        {/* Admin Access Section */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAdminLoggedIn ? (
                <ShieldCheck className="w-5 h-5 text-[#F3DCB3]" />
              ) : (
                <KeyRound className="w-5 h-5 text-[#F3DCB3]" />
              )}
              <span className="text-sm font-semibold text-white">
                Admin Access
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                isAdminLoggedIn
                  ? 'bg-[#F3DCB3] text-[#1A1033]'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {isAdminLoggedIn ? 'Admin Active' : 'Reader Mode'}
            </span>
          </div>

          {!isAdminLoggedIn ? (
            <form onSubmit={handleLoginSubmit} className="space-y-2.5">
              <p className="text-xs text-white/70">
                Enter the secret Admin PIN to unlock publishing, drafts, and
                profile editing. (Default PIN: 1234)
              </p>
              <input
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter Admin PIN"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F3DCB3]/60"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Login as Admin</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3.5">
              <form onSubmit={handlePinUpdate} className="space-y-2">
                <p className="text-xs font-medium text-[#F3DCB3]">
                  Change Secret Admin PIN
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New PIN (min 4 chars)"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm New PIN"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full min-h-[38px] rounded-full glass-pill text-xs font-semibold text-[#F3DCB3] hover:bg-white/15 transition disabled:opacity-60"
                >
                  Update Admin PIN
                </button>
              </form>

              {dbStatus === 'missing_schema' && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-300/35 text-amber-100 text-[11px] space-y-2">
                  <p>
                    Run the Supabase SQL setup script in your SQL Editor, then tap
                    Sync Now to enable global publishing.
                  </p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      await onRetrySync();
                      setIsBusy(false);
                    }}
                    className="w-full min-h-[34px] rounded-full bg-amber-300 text-[#1A1033] font-bold text-[11px]"
                  >
                    Sync Now
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onAdminLogout();
                    onClose();
                  }}
                  className="w-full min-h-[42px] rounded-full bg-rose-500/20 border border-rose-300/35 text-rose-100 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Admin Logout (Preview as Reader)</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onResetSampleData();
                      setFeedback('Sample works synced to Supabase.');
                      setTimeout(() => setFeedback(null), 2200);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Could not restore sample works.',
                      );
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="w-full min-h-[36px] rounded-full glass-pill text-white/70 hover:text-white text-[11px] flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Initial Sample Works</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. iOS / Fallback PWA Install Guide Modal                                   */
/* -------------------------------------------------------------------------- */
interface InstallGuideModalProps {
  onClose: () => void;
}

export function InstallGuideModal({ onClose }: InstallGuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[350px] glass-panel rounded-3xl p-5 text-center space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close install guide"
          className="absolute top-3.5 right-3.5 min-w-[34px] min-h-[34px] rounded-full glass-pill flex items-center justify-center text-white/85"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F3DCB3]/15 border border-[#F3DCB3]/40 flex items-center justify-center shadow-[0_0_24px_rgba(243,220,179,0.25)]">
          <Smartphone className="w-7 h-7 text-[#F3DCB3]" />
        </div>

        <div className="space-y-2">
          <h3 className="font-display text-2xl font-bold text-white">
            Install AYNORA UNIVERSE
          </h3>
          <p className="text-xs leading-relaxed text-white/90 px-1">
            Tap the <strong className="text-[#F3DCB3]">Share button (⬆️)</strong>{' '}
            in your browser and select{' '}
            <strong className="text-[#F3DCB3]">&lsquo;Add to Home Screen&rsquo;</strong>{' '}
            to install AYNORA UNIVERSE.
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-center gap-2 text-xs text-[#F3DCB3]">
          <Share className="w-4 h-4 shrink-0" />
          <span>Share &rarr; Add to Home Screen</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-full bg-[#F3DCB3] text-[#1A1033] text-xs font-bold shadow-[0_0_20px_rgba(243,220,179,0.35)] active:scale-95 transition"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
