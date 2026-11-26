import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  Hash,
  History,
  LogOut,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { PRIZE_MENUS } from '../data/prizeMenus';
import {
  HistoryEntry,
  PrizeMenuId,
  RaffleConfig,
  WinnerRecord,
} from '../types/raffle';
import { formatTicketNumber } from '../utils/raffleEngine';

type AdminTab = 'numbers' | 'winners' | 'reset';

interface AdminModalProps {
  isOpen: boolean;
  config: RaffleConfig;
  winners: WinnerRecord[];
  historyLog: HistoryEntry[];
  eligibleCount: number;
  firebaseUserEmail: string | null;
  firebaseConnecting: boolean;
  firebaseError: string | null;
  onConnectFirebase: () => void;
  onDisconnectFirebase: () => void;
  onClose: () => void;
  onUpdateRange: (minNumber: number, maxNumber: number) => void;
  onToggleExcludeNumber: (num: number) => void;
  onCancelWinner: (winnerId: string) => void;
  onRestoreAllExcluded: () => void;
  onFullReset: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  config,
  winners,
  historyLog,
  eligibleCount,
  firebaseUserEmail,
  firebaseConnecting,
  firebaseError,
  onConnectFirebase,
  onDisconnectFirebase,
  onClose,
  onUpdateRange,
  onToggleExcludeNumber,
  onCancelWinner,
  onRestoreAllExcluded,
  onFullReset,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('numbers');
  const [minInput, setMinInput] = useState(String(config.minNumber));
  const [maxInput, setMaxInput] = useState(String(config.maxNumber));
  const [rangeError, setRangeError] = useState('');
  const [rangeSavedMsg, setRangeSavedMsg] = useState('');

  const [winnerFilter, setWinnerFilter] = useState<'all' | PrizeMenuId>('all');
  const [showReplacedHistory, setShowReplacedHistory] = useState(false);
  const [confirmResetStep, setConfirmResetStep] = useState(false);

  // Sync local inputs when modal opens or config changes externally
  React.useEffect(() => {
    if (isOpen) {
      setMinInput(String(config.minNumber));
      setMaxInput(String(config.maxNumber));
      setRangeError('');
      setRangeSavedMsg('');
      setConfirmResetStep(false);
    }
  }, [isOpen, config.minNumber, config.maxNumber]);

  const winnerMapByTicket = useMemo(() => {
    const map = new Map<number, WinnerRecord>();
    winners.forEach((w) => map.set(w.ticketNumber, w));
    return map;
  }, [winners]);

  const excludedSet = useMemo(
    () => new Set(config.excludedNumbers),
    [config.excludedNumbers]
  );

  const allRangeNumbers = useMemo(() => {
    const list: number[] = [];
    for (let n = config.minNumber; n <= config.maxNumber; n += 1) {
      list.push(n);
    }
    return list;
  }, [config.minNumber, config.maxNumber]);

  if (!isOpen) return null;

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMin = parseInt(minInput, 10);
    const parsedMax = parseInt(maxInput, 10);

    if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax)) {
      setRangeError('유효한 숫자를 입력해 주세요.');
      return;
    }
    if (parsedMin < 1) {
      setRangeError('시작 번호는 1 이상이어야 합니다.');
      return;
    }
    if (parsedMax < parsedMin) {
      setRangeError('끝 번호는 시작 번호보다 크거나 같아야 합니다.');
      return;
    }
    if (parsedMax - parsedMin + 1 > 2000) {
      setRangeError('참가 번호 범위는 최대 2,000개까지 설정할 수 있습니다.');
      return;
    }

    setRangeError('');
    onUpdateRange(parsedMin, parsedMax);
    setRangeSavedMsg(
      `${formatTicketNumber(parsedMin, parsedMax)}번 – ${formatTicketNumber(parsedMax, parsedMax)}번으로 저장되었습니다.`
    );
  };

  const handleDownloadCsv = () => {
    const sorted = [...winners].sort((a, b) => {
      const orderMap: Record<PrizeMenuId, number> = {
        combo: 1,
        necessities_1: 2,
        necessities_2: 3,
        voucher: 4,
      };
      if (orderMap[a.menuId] !== orderMap[b.menuId]) {
        return orderMap[a.menuId] - orderMap[b.menuId];
      }
      return a.slotId.localeCompare(b.slotId);
    });

    const header = ['순번', '경품 메뉴', '세부 경품', '당첨 번호', '재추첨 여부', '추첨 시각'];
    const rows = sorted.map((w, idx) => [
      String(idx + 1),
      w.menuTitle,
      w.slotLabel,
      formatTicketNumber(w.ticketNumber, config.maxNumber),
      w.isRedraw ? '재추첨' : '최초 당첨',
      new Date(w.drawnAt).toLocaleString('ko-KR'),
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `함께빛나는어울림_당첨자기록_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayedRecords = showReplacedHistory
    ? historyLog.filter(
        (h) => winnerFilter === 'all' || h.menuId === winnerFilter
      )
    : winners
        .filter((w) => winnerFilter === 'all' || w.menuId === winnerFilter)
        .map((w) => ({ ...w, status: 'active' as const }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F1B16]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFFDF9] border border-[#E2D6C1] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E8DFCE] flex items-center justify-between gap-4">
          <div>
            <h2
              id="admin-modal-title"
              className="font-serif-kr text-xl font-bold text-[#1F1B16]"
            >
              관리자 모드
            </h2>
            <p className="text-xs sm:text-sm text-[#786B59] mt-0.5 font-display-num">
              현재 범위 {formatTicketNumber(config.minNumber, config.maxNumber)}–
              {formatTicketNumber(config.maxNumber, config.maxNumber)}번 · 당첨{' '}
              {winners.length}명 · 추첨 가능 {eligibleCount}명
            </p>
          </div>

          <div className="flex items-center gap-3">
            {firebaseUserEmail ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium truncate max-w-[180px]">
                  {firebaseUserEmail}
                </span>
                <button
                  type="button"
                  onClick={onDisconnectFirebase}
                  title="Firebase 연결 해제"
                  className="inline-flex items-center gap-1 ml-1 text-[#6E6150] hover:text-[#B91C1C] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={firebaseConnecting}
                onClick={onConnectFirebase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8CCB7] bg-[#FFFDF9] hover:bg-[#FAF4E8] text-xs font-semibold text-[#4B4237] transition-colors cursor-pointer whitespace-nowrap"
              >
                <CloudOff className="w-3.5 h-3.5 text-[#8D7F6B]" />
                <span>
                  {firebaseConnecting ? '연결 중...' : 'Firebase 클라우드 연동'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="관리자 모드 닫기"
              className="p-2 rounded-lg text-[#6E6150] hover:bg-[#FAF4E8] hover:text-[#1F1B16] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {firebaseError && (
          <div className="px-6 py-2.5 bg-[#FEF2F2] border-b border-[#FECACA] text-xs font-medium text-[#991B1B]">
            {firebaseError}
          </div>
        )}

        {/* Modal Tabs */}
        <div className="px-6 pt-3 bg-white border-b border-[#E8DFCE] flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('numbers')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'numbers'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#6E6150] hover:text-[#1F1B16]'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>참가 번호 설정 (1–218 수정)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('winners')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'winners'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#6E6150] hover:text-[#1F1B16]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>당첨자 기록 ({winners.length}명)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'reset'
                ? 'border-[#B91C1C] text-[#B91C1C]'
                : 'border-transparent text-[#6E6150] hover:text-[#1F1B16]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>전체 리셋</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'numbers' && (
            <div className="space-y-6">
              {/* Range Form */}
              <form
                onSubmit={handleApplyRange}
                className="p-5 rounded-xl bg-white border border-[#E8DFCE] space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="min-num-input"
                      className="block text-xs font-semibold text-[#574D40] mb-1.5"
                    >
                      시작 번호
                    </label>
                    <input
                      id="min-num-input"
                      type="number"
                      min={1}
                      max={9999}
                      value={minInput}
                      onChange={(e) => {
                        setMinInput(e.target.value);
                        setRangeSavedMsg('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CCB7] bg-[#FFFDF9] text-[#1F1B16] font-display-num font-bold text-base focus:outline-none focus:border-[#B91C1C]"
                    />
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor="max-num-input"
                      className="block text-xs font-semibold text-[#574D40] mb-1.5"
                    >
                      끝 번호 (기본 218)
                    </label>
                    <input
                      id="max-num-input"
                      type="number"
                      min={1}
                      max={9999}
                      value={maxInput}
                      onChange={(e) => {
                        setMaxInput(e.target.value);
                        setRangeSavedMsg('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CCB7] bg-[#FFFDF9] text-[#1F1B16] font-display-num font-bold text-base focus:outline-none focus:border-[#B91C1C]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#166534] hover:bg-[#14532D] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    범위 적용
                  </button>
                </div>

                {rangeError && (
                  <p className="text-xs font-semibold text-[#B91C1C]">
                    {rangeError}
                  </p>
                )}
                {rangeSavedMsg && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{rangeSavedMsg}</span>
                  </p>
                )}
              </form>

              {/* Individual Number Grid */}
              <div className="p-5 rounded-xl bg-white border border-[#E8DFCE] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#1F1B16]">
                      개별 번호 상태 관리
                    </h3>
                    <p className="text-xs text-[#786B59] mt-0.5">
                      번호를 클릭하면 추첨 대상에서 제외하거나 다시 추첨 가능 상태로 복원할 수 있습니다.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-[#4B4237]">
                      <span className="w-3 h-3 rounded bg-[#FFFDF8] border border-[#D8CCB7]" />
                      추첨 가능
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#166534] font-semibold">
                      <span className="w-3 h-3 rounded bg-[#DCFCE7] border border-[#166534]" />
                      당첨 완료
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#8D7F6B]">
                      <span className="w-3 h-3 rounded bg-[#EFEAE1] border border-[#D5C9B6]" />
                      제외됨 ({config.excludedNumbers.length})
                    </span>

                    {config.excludedNumbers.length > 0 && (
                      <button
                        type="button"
                        onClick={onRestoreAllExcluded}
                        className="px-2.5 py-1 rounded-md bg-[#FAF4E8] hover:bg-[#EFE2CA] text-[#92400E] font-semibold cursor-pointer"
                      >
                        제외 번호 모두 복원
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {allRangeNumbers.map((num) => {
                    const winner = winnerMapByTicket.get(num);
                    const isExcluded = excludedSet.has(num);
                    const label = formatTicketNumber(num, config.maxNumber);

                    if (winner) {
                      return (
                        <div
                          key={num}
                          title={`${label}번 - 당첨 (${winner.slotLabel})`}
                          className="py-1.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-xs font-display-num font-bold text-center select-none"
                        >
                          {label}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onToggleExcludeNumber(num)}
                        title={
                          isExcluded
                            ? `${label}번 클릭하여 추첨 대상에 복원`
                            : `${label}번 클릭하여 추첨 대상에서 제외`
                        }
                        className={`py-1.5 rounded-lg text-xs font-display-num font-semibold text-center transition-colors cursor-pointer ${
                          isExcluded
                            ? 'bg-[#EFEAE1] border border-[#D5C9B6] text-[#9A8D7A] line-through hover:bg-[#E5DEC9]'
                            : 'bg-[#FFFDF8] border border-[#E2D6C1] text-[#2E2720] hover:border-[#B91C1C] hover:text-[#B91C1C]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'winners' && (
            <div className="space-y-4">
              {/* Filter & Export Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWinnerFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      winnerFilter === 'all'
                        ? 'bg-[#1F1B16] text-white'
                        : 'bg-white border border-[#E2D6C1] text-[#574D40] hover:bg-[#FAF4E8]'
                    }`}
                  >
                    전체 ({winners.length})
                  </button>
                  {PRIZE_MENUS.map((m) => {
                    const count = winners.filter((w) => w.menuId === m.id).length;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setWinnerFilter(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          winnerFilter === m.id
                            ? 'bg-[#B91C1C] text-white'
                            : 'bg-white border border-[#E2D6C1] text-[#574D40] hover:bg-[#FAF4E8]'
                        }`}
                      >
                        {m.shortTitle} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#574D40] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showReplacedHistory}
                      onChange={(e) => setShowReplacedHistory(e.target.checked)}
                      className="rounded border-[#D8CCB7] accent-[#B91C1C]"
                    />
                    <span>재추첨/취소 이력 포함</span>
                  </label>

                  <button
                    type="button"
                    disabled={winners.length === 0}
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#166534] hover:bg-[#14532D] disabled:bg-[#C7BBAE] disabled:cursor-not-allowed text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV 다운로드</span>
                  </button>
                </div>
              </div>

              {/* Winners Table */}
              <div className="rounded-xl bg-white border border-[#E8DFCE] overflow-hidden">
                {displayedRecords.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[#8D7F6B]">
                    아직 추첨된 당첨자 기록이 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8DFCE] bg-[#FAF6EE] text-xs font-semibold text-[#6E6150]">
                          <th className="py-3 px-4">번호</th>
                          <th className="py-3 px-4">경품 메뉴</th>
                          <th className="py-3 px-4">세부 경품</th>
                          <th className="py-3 px-4">당첨 번호</th>
                          <th className="py-3 px-4">상태</th>
                          <th className="py-3 px-4">추첨 시각</th>
                          <th className="py-3 px-4 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2EAE0] text-sm">
                        {displayedRecords.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={
                              entry.status !== 'active'
                                ? 'bg-[#FAF8F5] text-[#9A8D7A]'
                                : 'text-[#1F1B16]'
                            }
                          >
                            <td className="py-3 px-4 font-display-num text-xs text-[#786B59]">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4 font-medium whitespace-nowrap">
                              {entry.menuTitle}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {entry.slotLabel}
                            </td>
                            <td className="py-3 px-4 font-display-num font-bold text-base">
                              <span
                                className={
                                  entry.status === 'active'
                                    ? 'text-[#B91C1C]'
                                    : 'line-through'
                                }
                              >
                                {formatTicketNumber(
                                  entry.ticketNumber,
                                  config.maxNumber
                                )}
                                번
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                              {entry.status === 'active'
                                ? entry.isRedraw
                                  ? '확정 (재추첨)'
                                  : '확정'
                                : entry.status === 'replaced'
                                  ? '재추첨으로 교체됨'
                                  : '취소됨'}
                            </td>
                            <td className="py-3 px-4 font-display-num text-xs text-[#786B59] whitespace-nowrap">
                              {new Date(entry.drawnAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {entry.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => onCancelWinner(entry.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E5D7C3] bg-white hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#B91C1C] text-xs font-medium text-[#574D40] transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>당첨 취소</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="p-6 rounded-xl bg-white border border-[#E8DFCE] space-y-5 max-w-xl">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#1F1B16]">
                  추첨 데이터 전체 초기화
                </h3>
                <p className="text-sm text-[#574D40] leading-relaxed">
                  모든 메뉴의 당첨 결과와 추첨 기록, 제외된 번호 목록을 초기화하고{' '}
                  <strong className="font-display-num">
                    {formatTicketNumber(config.minNumber, config.maxNumber)}번 –{' '}
                    {formatTicketNumber(config.maxNumber, config.maxNumber)}번
                  </strong>{' '}
                  전체 번호를 다시 추첨 가능한 상태로 되돌립니다.
                </p>
              </div>

              {!confirmResetStep ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetStep(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>전체 리셋하기</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-3">
                  <p className="text-sm font-bold text-[#991B1B]">
                    정말 모든 당첨 기록을 삭제하고 처음부터 다시 시작할까요?
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onFullReset();
                        setConfirmResetStep(false);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold cursor-pointer"
                    >
                      네, 전체 초기화합니다
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetStep(false)}
                      className="px-4 py-2 rounded-lg bg-white border border-[#E2D6C1] text-[#4B4237] text-xs font-semibold hover:bg-[#FAF4E8] cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
