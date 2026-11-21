export interface CategoryPillItem {
  id: string;
  label: string;
  count: number;
}

interface CategoryBarProps {
  items: CategoryPillItem[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryBar({
  items,
  activeCategory,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div className="px-3.5 py-2.5 border-b border-white/10 bg-[#160C32]/45 backdrop-blur-md">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {items.map((item) => {
          const isActive = activeCategory === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCategory(item.id)}
              className={`shrink-0 whitespace-nowrap min-h-[36px] px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#F3DCB3] text-[#1A1033] font-semibold shadow-[0_4px_14px_rgba(243,220,179,0.28)]'
                  : 'glass-pill text-white/90 hover:bg-white/15'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[11px] tabular-nums ${
                  isActive ? 'text-[#1A1033]/75' : 'text-white/60'
                }`}
              >
                ({item.count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
