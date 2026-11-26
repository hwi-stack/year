export type PrizeMenuId = 'combo' | 'necessities_1' | 'necessities_2' | 'voucher';

export interface PrizeSlot {
  slotId: string;
  menuId: PrizeMenuId;
  prizeName: string;
  slotLabel: string;
  order: number;
}

export interface PrizeMenu {
  id: PrizeMenuId;
  title: string;
  shortTitle: string;
  subtitle: string;
  totalCount: number;
  slots: PrizeSlot[];
}

export interface WinnerRecord {
  id: string;
  slotId: string;
  menuId: PrizeMenuId;
  menuTitle: string;
  prizeName: string;
  slotLabel: string;
  ticketNumber: number;
  drawnAt: string;
  isRedraw: boolean;
}

export interface HistoryEntry extends WinnerRecord {
  status: 'active' | 'replaced' | 'cancelled';
  note?: string;
}

export interface RaffleConfig {
  minNumber: number;
  maxNumber: number;
  excludedNumbers: number[];
}

export interface RaffleState {
  config: RaffleConfig;
  winners: WinnerRecord[];
  historyLog: HistoryEntry[];
}
