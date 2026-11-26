import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Cloud,
  CloudOff,
  Gift,
  Maximize2,
  Minimize2,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  PrizeMenu,
  PrizeMenuId,
  PrizeSlot,
  RaffleConfig,
  WinnerRecord,
} from '../types/raffle';
import { formatTicketNumber, getDigitLength } from '../utils/raffleEngine';
import { DigitRevealNumber } from './DigitRevealNumber';

const BANNER_IMAGE_PATH =
  '/src/assets/images/christmas_event_banner_1795654383371.jpg';

interface DrawStageProps {
  menu: PrizeMenu;
  allMenus: PrizeMenu[];
  completedMenuIds: Set<PrizeMenuId>;
  config: RaffleConfig;
  eligibleCount: number;
  menuWinners: WinnerRecord[];
  /** Map from slotId -> how many digits from the right are revealed */
  slotRevealProgress: Record<string, number>;
  /** Slot IDs that just completed revealing to show warm celebration highlight */
  justCompletedSlotIds: string[];
  isAnyRevealing: boolean;
  soundEnabled: boolean;
  isFullscreen: boolean;
  isFirebaseConnected: boolean;
  firebaseConnecting: boolean;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onConnectFirebase: () => void;
  onStartDrawMenu: (menu: PrizeMenu) => void;
  onRedrawSlot: (slot: PrizeSlot) => void;
  onRedrawSelectedSlots: (slots: PrizeSlot[]) => void;
  onRevealAllNow: () => void;
  onSelectMenu: (menuId: PrizeMenuId) => void;
  onOpenAdmin: () => void;
}

export const DrawStage: React.FC<DrawStageProps> = ({
  menu,
  allMenus,
  completedMenuIds,
  config,
  eligibleCount,
  menuWinners,
  slotRevealProgress,
  justCompletedSlotIds,
  isAnyRevealing,
  soundEnabled,
  isFullscreen,
  isFirebaseConnected,
  firebaseConnecting,
  onToggleSound,
  onToggleFullscreen,
  onConnectFirebase,
  onStartDrawMenu,
  onRedrawSlot,
  onRedrawSelectedSlots,
  onRevealAllNow,
  onSelectMenu,
  onOpenAdmin,
}) => {
  const [confirmRedrawAll, setConfirmRedrawAll] = useState(false);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  useEffect(() => {
    setConfirmRedrawAll(false);
    setSelectedSlotIds([]);
  }, [menu.id]);

  // Clear selection if a reveal starts
  useEffect(() => {
    if (isAnyRevealing) {
      setSelectedSlotIds([]);
    }
  }, [isAnyRevealing]);

  const totalDigits = getDigitLength(config.maxNumber);
  const winnerBySlot = new Map<string, WinnerRecord>(
    menuWinners.map((w) => [w.slotId, w])
  );
  const justCompletedSet = new Set(justCompletedSlotIds);
  const selectedSet = new Set(selectedSlotIds);

  const hasWinners = menuWinners.length > 0;
  const insufficientPool = !hasWinners && eligibleCount < menu.totalCount;
  const insufficientForSingleRedraw = eligibleCount < 1;
  const insufficientForSelectedRedraw =
    selectedSlotIds.length > 0 && eligibleCount < selectedSlotIds.length;

  const nextPendingMenu = allMenus.find(
    (m) => m.id !== menu.id && !completedMenuIds.has(m.id)
  );

  // Determine active reveal stage description
  const activeRevealValues = Object.entries(slotRevealProgress)
    .filter(([slotId]) => menu.slots.some((s) => s.slotId === slotId))
    .map(([, step]) => step)
    .filter((step) => step < totalDigits);

  const minRevealedStep =
    activeRevealValues.length > 0 ? Math.min(...activeRevealValues) : totalDigits;

  const getRevealStatusMessage = (): string => {
    if (!isAnyRevealing || minRevealedStep >= totalDigits) return '';
    if (minRevealedStep === 0) {
      return '행운의 번호 추첨 중 · 잠시 후 일의 자리가 멈춥니다';
    }
    if (minRevealedStep === 1) {
      return '일의 자리 공개 완료 · 2초 후 십의 자리가 멈춥니다';
    }
    if (minRevealedStep === 2) {
      return '십의 자리 공개 완료 · 2초 후 백의 자리가 멈춥니다';
    }
    return `자리수 공개 진행 중 (${minRevealedStep}/${totalDigits})`;
  };

  const toggleSlotSelection = (slotId: string) => {
    if (isAnyRevealing) return;
    setSelectedSlotIds((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  };

  const handleSelectAllSlots = () => {
    if (isAnyRevealing) return;
    const allDrawnSlotIds = menu.slots
      .filter((s) => winnerBySlot.has(s.slotId))
      .map((s) => s.slotId);
    setSelectedSlotIds(allDrawnSlotIds);
  };

  const handleClearSelection = () => {
    setSelectedSlotIds([]);
  };

  const handleRedrawChecked = () => {
    if (selectedSlotIds.length === 0 || insufficientForSelectedRedraw) return;
    const targetSlots = menu.slots.filter((s) => selectedSet.has(s.slotId));
    setSelectedSlotIds([]);
    onRedrawSelectedSlots(targetSlots);
  };

  const showCelebrationBanner =
    !isAnyRevealing &&
    hasWinners &&
    menu.slots.some((s) => justCompletedSet.has(s.slotId));

  const renderSlotCard = (slot: PrizeSlot, size: 'lg' | 'md') => {
    const winner = winnerBySlot.get(slot.slotId) ?? null;
    const revealedCount = winner
      ? (slotRevealProgress[slot.slotId] ?? totalDigits)
      : 0;
    const isSlotRevealing = winner !== null && revealedCount < totalDigits;
    const isSlotComplete = winner !== null && revealedCount >= totalDigits;
    const isJustFinished =
      isSlotComplete && justCompletedSet.has(slot.slotId);
    const isSelected = selectedSet.has(slot.slotId);

    return (
      <div
        key={slot.slotId}
        className={`relative flex flex-col justify-between rounded-2xl bg-white transition-all duration-300 ${
          size === 'lg' ? 'p-6 sm:p-7' : 'p-5'
        } ${isJustFinished ? 'animate-winner-glow' : ''} ${
          isSelected
            ? 'border-2 border-[#B91C1C] bg-[#FFF8F6] shadow-[0_8px_24px_-6px_rgba(185,28,28,0.18)]'
            : isSlotComplete
              ? 'border-2 border-[#D97706]/60 shadow-[0_6px_24px_-6px_rgba(180,83,9,0.13)]'
              : isSlotRevealing
                ? 'border-2 border-[#B91C1C]/55 shadow-[0_8px_28px_-6px_rgba(185,28,28,0.16)]'
                : 'border border-[#E8DFCE] shadow-sm'
        }`}
      >
        {/* Top Row: Checkbox + Prize Name + Redraw Indicator */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {winner && !isAnyRevealing && (
              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSlotSelection(slot.slotId)}
                  aria-label={`${slot.slotLabel} 재추첨 선택`}
                  className="sr-only"
                />
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-[#B91C1C]" />
                ) : (
                  <Square className="w-5 h-5 text-[#B5A792] hover:text-[#786B59] transition-colors" />
                )}
              </label>
            )}
            <h3
              className={`font-bold text-[#1F1B16] truncate ${
                size === 'lg' ? 'text-lg sm:text-xl' : 'text-base'
              }`}
              title={slot.slotLabel}
            >
              {slot.slotLabel}
            </h3>
          </div>

          {winner?.isRedraw && (
            <span className="text-xs font-medium text-[#B45309] whitespace-nowrap shrink-0">
              재추첨
            </span>
          )}
        </div>

        {/* Center: Giant Right-to-Left Rolling Digit Reveal */}
        <div className="py-2 sm:py-3 flex items-center justify-center">
          <DigitRevealNumber
            ticketNumber={winner ? winner.ticketNumber : null}
            maxNumber={config.maxNumber}
            revealedCount={revealedCount}
            size={size}
            isRevealing={isSlotRevealing}
            justFinished={isJustFinished}
          />
        </div>

        {/* Bottom Row: Individual Redraw Control */}
        <div className="mt-4 pt-3 border-t border-[#F2EAE0] flex items-center justify-between gap-2">
          <span className="text-xs text-[#786B59] whitespace-nowrap">
            {isSlotComplete
              ? `당첨 ${formatTicketNumber(winner.ticketNumber, config.maxNumber)}번`
              : isSlotRevealing
                ? '번호 추첨 중'
                : '추첨 대기'}
          </span>

          {winner && (
            <button
              type="button"
              disabled={isAnyRevealing || insufficientForSingleRedraw}
              onClick={() => onRedrawSlot(slot)}
              title={
                insufficientForSingleRedraw
                  ? '남은 추첨 가능 번호가 없습니다'
                  : `${slot.slotLabel} 건별 재추첨`
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5C4F3E] bg-[#FAF4E8] hover:bg-[#F1E4CD] hover:text-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>재추첨</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const isComboMenu = menu.id === 'combo';
  const comboFeaturedSlots = isComboMenu ? menu.slots.slice(0, 3) : [];
  const comboRemainingSlots = isComboMenu ? menu.slots.slice(3) : [];

  return (
    <main className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Warm Christmas Event Banner & Menu Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[#E5DAC5] bg-[#FFFDF8] shadow-sm">
        {!bannerLoadFailed && (
          <img
            src={BANNER_IMAGE_PATH}
            alt="따뜻한 겨울 크리스마스 마을 일러스트"
            referrerPolicy="no-referrer"
            onError={() => setBannerLoadFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-50 pointer-events-none select-none"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#FFFDF9] via-[#FFFDF9]/92 to-[#FFFDF9]/75 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 p-6 sm:p-8 lg:px-10 lg:py-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-xs sm:text-sm font-semibold text-[#166534] tracking-wide">
              수원시장애인종합복지관 가족 송년의 밤 · 함께 빛나는 어울림
            </p>
            <h1 className="font-serif-kr text-2xl sm:text-4xl font-bold text-[#1F1B16] tracking-tight text-balance">
              {menu.title}
            </h1>
            <p className="text-sm sm:text-base text-[#574D40] leading-relaxed">
              {menu.subtitle}
            </p>

            {/* Unboxed Clean Metadata */}
            <div className="pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#6E6150] font-display-num">
              <span>
                참가 번호 {formatTicketNumber(config.minNumber, config.maxNumber)}번 –{' '}
                {formatTicketNumber(config.maxNumber, config.maxNumber)}번
              </span>
              <span aria-hidden="true">·</span>
              <span>
                추첨 가능 <strong className="text-[#166534]">{eligibleCount}명</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>중복 당첨 자동 제외</span>
            </div>
          </div>

          {/* Primary Stage Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? '전체화면 종료 (Esc)' : 'PC 전체화면으로 보기'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#DFD2BC] bg-white/90 text-[#4B4237] text-sm font-medium hover:bg-[#FAF4E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-[#B91C1C]" />
              ) : (
                <Maximize2 className="w-4 h-4 text-[#574D40]" />
              )}
              <span>{isFullscreen ? '전체화면 종료' : '전체화면'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? '축하 음악 및 효과음 끄기' : '축하 음악 및 효과음 켜기'}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#DFD2BC] bg-white/90 text-[#4B4237] text-sm font-medium hover:bg-[#FAF4E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#166534]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#8D7F6B]" />
              )}
              <span>{soundEnabled ? '음악 · 효과음 켜짐' : '음악 · 효과음 꺼짐'}</span>
            </button>

            {!isFirebaseConnected ? (
              <button
                type="button"
                disabled={firebaseConnecting}
                onClick={onConnectFirebase}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#DFD2BC] bg-white/90 text-[#4B4237] text-sm font-medium hover:bg-[#FAF4E8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
              >
                <CloudOff className="w-4 h-4 text-[#8D7F6B]" />
                <span>{firebaseConnecting ? '연결 중...' : 'Firebase 연결'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAdmin}
                title="Firebase 실시간 클라우드 동기화 중"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#166534] text-sm font-semibold hover:bg-[#DCFCE7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Firebase 동기화됨</span>
              </button>
            )}

            {isAnyRevealing ? (
              <button
                type="button"
                onClick={onRevealAllNow}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-base font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
              >
                <Zap className="w-4 h-4" />
                <span>지금 바로 전체 공개</span>
              </button>
            ) : !hasWinners ? (
              <button
                type="button"
                disabled={insufficientPool}
                onClick={() => onStartDrawMenu(menu)}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] disabled:bg-[#C7BBAE] disabled:cursor-not-allowed text-white text-base sm:text-lg font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
              >
                <Gift className="w-5 h-5" />
                <span>{menu.totalCount}명 추첨 시작하기</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                {!confirmRedrawAll ? (
                  <button
                    type="button"
                    disabled={eligibleCount < menu.totalCount}
                    onClick={() => setConfirmRedrawAll(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DFD2BC] bg-white hover:bg-[#FAF4E8] disabled:opacity-45 disabled:cursor-not-allowed text-[#4B4237] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>이 메뉴 전체 다시 추첨</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                    <span className="text-xs font-semibold text-[#991B1B] whitespace-nowrap">
                      기존 번호 제외 후 다시 뽑을까요?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmRedrawAll(false);
                        onStartDrawMenu(menu);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] cursor-pointer whitespace-nowrap"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRedrawAll(false)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E5D7C3] text-[#574D40] text-xs font-medium hover:bg-[#FAF4E8] cursor-pointer whitespace-nowrap"
                    >
                      취소
                    </button>
                  </div>
                )}

                {nextPendingMenu && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRedrawAll(false);
                      onSelectMenu(nextPendingMenu.id);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-sm font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>다음: {nextPendingMenu.shortTitle}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Reveal Progress Banner, Celebration Banner, or Pool Warning */}
      {isAnyRevealing && getRevealStatusMessage() && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]"
        >
          <div className="flex items-center gap-2.5 text-sm sm:text-base font-semibold">
            <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
            <span>{getRevealStatusMessage()}</span>
          </div>
          <span className="text-xs sm:text-sm font-display-num text-[#B45309] whitespace-nowrap">
            일의 자리 → 십의 자리 → 백의 자리
          </span>
        </div>
      )}

      {showCelebrationBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/70 to-[#FFFDF8] border border-[#F59E0B]/50 text-[#92400E] shadow-sm"
        >
          <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
            <PartyPopper className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <span>축하합니다! 당첨 번호가 모두 공개되었습니다.</span>
          </div>
          <span className="text-xs sm:text-sm text-[#78350F]">
            부재중인 번호가 있다면 체크박스로 선택해 한 번에 재추첨할 수 있습니다.
          </span>
        </div>
      )}

      {insufficientPool && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>
              추첨 가능한 인원({eligibleCount}명)이 필요한 당첨 인원({menu.totalCount}명)보다
              적습니다. 관리자 모드에서 번호 범위를 늘리거나 초기화해 주세요.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-4 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            관리자 모드 열기
          </button>
        </div>
      )}

      {/* Checkbox Selection Bar for Batch Selective Redraw */}
      {hasWinners && !isAnyRevealing && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-white border border-[#E8DFCE] shadow-xs">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-[#2E2720]">
              {selectedSlotIds.length > 0
                ? `${selectedSlotIds.length}개 경품 선택됨`
                : '원하는 경품을 체크해 선택 항목만 재추첨할 수 있습니다'}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllSlots}
                className="px-2.5 py-1 rounded-md bg-[#FAF4E8] hover:bg-[#F0E3CA] text-[#5C4F3E] font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                전체 선택
              </button>
              {selectedSlotIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-md bg-[#F5EFE2] hover:bg-[#EAE0CE] text-[#6E6150] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  선택 해제
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {insufficientForSelectedRedraw && (
              <span className="text-xs font-semibold text-[#B91C1C]">
                남은 인원({eligibleCount}명)이 부족합니다
              </span>
            )}
            <button
              type="button"
              disabled={
                selectedSlotIds.length === 0 || insufficientForSelectedRedraw
              }
              onClick={handleRedrawChecked}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] disabled:bg-[#DFD5C5] disabled:text-[#8E8170] disabled:cursor-not-allowed text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {selectedSlotIds.length > 0
                  ? `선택한 ${selectedSlotIds.length}건 재추첨`
                  : '선택 재추첨'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Winner Grid */}
      {isComboMenu ? (
        <section className="space-y-5" aria-label="특별 경품 추첨 결과">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {comboFeaturedSlots.map((slot) => renderSlotCard(slot, 'lg'))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {comboRemainingSlots.map((slot) => renderSlotCard(slot, 'md'))}
          </div>
        </section>
      ) : (
        <section
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5"
          aria-label={`${menu.title} 추첨 결과`}
        >
          {menu.slots.map((slot) => renderSlotCard(slot, 'md'))}
        </section>
      )}
    </main>
  );
};
