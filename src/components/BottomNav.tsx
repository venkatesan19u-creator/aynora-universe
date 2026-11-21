import { BookOpen, Feather, Home, Library, PenSquare } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const NAV_ITEMS: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'novel', label: 'Novel', icon: BookOpen },
  { id: 'story', label: 'Story', icon: Library },
  { id: 'poetry', label: 'Poetry', icon: Feather },
  { id: 'write', label: 'Write', icon: PenSquare },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-3 pb-3 pt-1">
      <nav
        aria-label="Primary Navigation"
        className="pointer-events-auto glass-dock rounded-[26px] grid grid-cols-5 items-center h-[62px] px-1.5"
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-2xl transition-all active:scale-95 ${
                isActive
                  ? 'text-[#F3DCB3] bg-white/10'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <Icon
                className="w-[20px] h-[20px]"
                strokeWidth={isActive ? 2.3 : 1.75}
              />
              <span className="text-[10.5px] font-medium mt-0.5 tracking-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
