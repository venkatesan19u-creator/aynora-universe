import { Bell, Download, Search, Settings } from 'lucide-react';
import { WriterProfile } from '../types';

interface TopHeaderProps {
  writerProfile: WriterProfile;
  unreadNotifications: number;
  isAdminLoggedIn: boolean;
  isInstalled: boolean;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onInstallApp: () => void;
}

export function TopHeader({
  writerProfile,
  unreadNotifications,
  isAdminLoggedIn,
  isInstalled,
  onOpenProfile,
  onOpenSearch,
  onOpenNotifications,
  onOpenSettings,
  onInstallApp,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 px-2.5 pt-2.5 pb-2 bg-[#140B2D]/75 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between gap-1">
        {/* Left: App Logo + Full Brand Title + Writer Profile Avatar */}
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src="./assets/aistudio/IMG-20261121-WA0001_b144018d.jpg"
            alt="AYNORA UNIVERSE Logo"
            referrerPolicy="no-referrer"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-[#F3DCB3]/40 shadow-sm shrink-0"
          />
          <span className="font-display text-[14.5px] sm:text-[16px] font-bold tracking-[0.02em] text-[#F3DCB3] whitespace-nowrap shrink-0">
            AYNORA UNIVERSE
          </span>

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open Writer Profile"
            title={`Profile: ${writerProfile.name}`}
            className="ml-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full glass-pill hover:bg-white/15 active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <img
              src={writerProfile.photoUrl}
              alt={writerProfile.name}
              referrerPolicy="no-referrer"
              className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full object-cover border border-[#F3DCB3]/60"
            />
          </button>
        </div>

        {/* Right: Install (when not standalone), Search, Notifications Bell, Settings Gear */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={onInstallApp}
              aria-label="Install App"
              title="Install AYNORA UNIVERSE"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[#F3DCB3] bg-[#F3DCB3]/12 border border-[#F3DCB3]/30 hover:bg-[#F3DCB3]/20 active:scale-95 transition"
            >
              <Download className="w-[16px] h-[16px]" strokeWidth={2.1} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search published works"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 transition"
          >
            <Search className="w-[17px] h-[17px]" strokeWidth={1.9} />
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 transition"
          >
            <Bell className="w-[17px] h-[17px]" strokeWidth={1.9} />
            {unreadNotifications > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#F3DCB3] text-[#180E33] text-[9px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings and Admin Access"
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition ${
              isAdminLoggedIn
                ? 'text-[#F3DCB3] ring-1 ring-[#F3DCB3]/50 bg-[#F3DCB3]/10'
                : 'text-white/90'
            }`}
          >
            <Settings className="w-[17px] h-[17px]" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </header>
  );
}
