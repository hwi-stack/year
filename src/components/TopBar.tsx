import React from 'react';
import { Check, Settings } from 'lucide-react';
import { PrizeMenu, PrizeMenuId } from '../types/raffle';

interface TopBarProps {
  menus: PrizeMenu[];
  activeMenuId: PrizeMenuId;
  completedMenuIds: Set<PrizeMenuId>;
  onSelectMenu: (menuId: PrizeMenuId) => void;
  onOpenAdmin: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  menus,
  activeMenuId,
  completedMenuIds,
  onSelectMenu,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DFCE]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-line event brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectMenu(menus[0].id)}
          className="font-serif-kr text-lg sm:text-xl font-bold text-[#1F1B16] whitespace-nowrap shrink-0 hover:text-[#B91C1C] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B91C1C] cursor-pointer"
        >
          함께 빛나는 어울림
        </button>

        {/* Zone 2: Prize Menu Navigation */}
        <nav
          aria-label="경품 추첨 메뉴"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 no-scrollbar"
        >
          {menus.map((menu) => {
            const isActive = menu.id === activeMenuId;
            const isDone = completedMenuIds.has(menu.id);

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => onSelectMenu(menu.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C] ${
                  isActive
                    ? 'bg-[#B91C1C] text-white shadow-sm'
                    : 'text-[#4B4237] hover:bg-[#F3EBD9] hover:text-[#1F1B16]'
                }`}
              >
                <span>{menu.shortTitle}</span>
                {isDone && (
                  <Check
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#FDE68A]' : 'text-[#166534]'
                    }`}
                    aria-label="추첨 완료"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Admin Action (No password required) */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8CCB7] bg-white text-[#2E2720] text-sm font-semibold hover:bg-[#FAF4E8] hover:border-[#C5B395] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
          >
            <Settings className="w-4 h-4 text-[#786B59]" />
            <span>관리자 모드</span>
          </button>
        </div>
      </div>
    </header>
  );
};
