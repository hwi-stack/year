import {
  PrizeMenuId,
  RaffleConfig,
  RaffleState,
  WinnerRecord,
} from '../types/raffle';

export const DEFAULT_CONFIG: RaffleConfig = {
  minNumber: 1,
  maxNumber: 218,
  excludedNumbers: [],
};

export const INITIAL_STATE: RaffleState = {
  config: DEFAULT_CONFIG,
  winners: [],
  historyLog: [],
};

export function getDigitLength(maxNumber: number): number {
  return Math.max(3, String(Math.max(1, maxNumber)).length);
}

export function formatTicketNumber(num: number, maxNumber: number): string {
  const length = getDigitLength(maxNumber);
  return String(num).padStart(length, '0');
}

export function getEligibleNumbers(
  config: RaffleConfig,
  activeWinners: WinnerRecord[],
  extraExclude: number[] = []
): number[] {
  const wonSet = new Set(activeWinners.map((w) => w.ticketNumber));
  const excludedSet = new Set([...config.excludedNumbers, ...extraExclude]);

  const min = Math.max(1, Math.floor(config.minNumber));
  const max = Math.max(min, Math.floor(config.maxNumber));

  const eligible: number[] = [];
  for (let n = min; n <= max; n += 1) {
    if (!wonSet.has(n) && !excludedSet.has(n)) {
      eligible.push(n);
    }
  }
  return eligible;
}

/**
 * 생필품 1차·2차·문화상품권은 서로 중복 당첨을 방지하고,
 * 마지막 순서인 특별 경품(combo)은 기존 당첨자를 무시하고 전체 번호(해당 회차 내 중복만 방지)에서 추첨합니다.
 */
export function getEligibleNumbersForMenu(
  config: RaffleConfig,
  activeWinners: WinnerRecord[],
  menuId: PrizeMenuId,
  extraExclude: number[] = []
): number[] {
  const relevantWinners =
    menuId === 'combo'
      ? activeWinners.filter((w) => w.menuId === 'combo')
      : activeWinners.filter((w) => w.menuId !== 'combo');

  return getEligibleNumbers(config, relevantWinners, extraExclude);
}

export function pickRandomNumbers(eligible: number[], count: number): number[] {
  if (count <= 0 || eligible.length === 0) return [];
  const pool = [...eligible];
  const pickCount = Math.min(count, pool.length);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const randArray = new Uint32Array(1);
    crypto.getRandomValues(randArray);
    const j = randArray[0] % (i + 1);
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool.slice(0, pickCount);
}

export function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `win-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
