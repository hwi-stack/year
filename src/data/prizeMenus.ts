import { PrizeMenu, PrizeSlot } from '../types/raffle';

function makeRepeatedSlots(
  menuId: PrizeMenu['id'],
  prizeName: string,
  count: number,
  startOrder = 1
): PrizeSlot[] {
  return Array.from({ length: count }, (_, idx) => ({
    slotId: `${menuId}-${idx + 1}`,
    menuId,
    prizeName,
    slotLabel: `${prizeName} ${idx + 1}`,
    order: startOrder + idx,
  }));
}

export const PRIZE_MENUS: PrizeMenu[] = [
  {
    id: 'combo',
    title: '특별 경품 모음',
    shortTitle: '특별 경품 (7명)',
    subtitle: '밥솥 1 · 에어프라이어 1 · 냄비세트 1 · 손세정제 세트 3 · 핸드스피너 1',
    totalCount: 7,
    slots: [
      {
        slotId: 'combo-ricecooker-1',
        menuId: 'combo',
        prizeName: '밥솥',
        slotLabel: '밥솥',
        order: 1,
      },
      {
        slotId: 'combo-airfryer-1',
        menuId: 'combo',
        prizeName: '에어프라이어',
        slotLabel: '에어프라이어',
        order: 2,
      },
      {
        slotId: 'combo-potset-1',
        menuId: 'combo',
        prizeName: '냄비세트',
        slotLabel: '냄비세트',
        order: 3,
      },
      {
        slotId: 'combo-sanitizer-1',
        menuId: 'combo',
        prizeName: '손세정제 세트',
        slotLabel: '손세정제 세트 (1)',
        order: 4,
      },
      {
        slotId: 'combo-sanitizer-2',
        menuId: 'combo',
        prizeName: '손세정제 세트',
        slotLabel: '손세정제 세트 (2)',
        order: 5,
      },
      {
        slotId: 'combo-sanitizer-3',
        menuId: 'combo',
        prizeName: '손세정제 세트',
        slotLabel: '손세정제 세트 (3)',
        order: 6,
      },
      {
        slotId: 'combo-spinner-1',
        menuId: 'combo',
        prizeName: '핸드스피너',
        slotLabel: '핸드스피너',
        order: 7,
      },
    ],
  },
  {
    id: 'necessities_1',
    title: '생필품 세트 (1차)',
    shortTitle: '생필품 1차 (10명)',
    subtitle: '가정용 생필품 선물세트 10명 동시 추첨',
    totalCount: 10,
    slots: makeRepeatedSlots('necessities_1', '생필품', 10),
  },
  {
    id: 'necessities_2',
    title: '생필품 세트 (2차)',
    shortTitle: '생필품 2차 (10명)',
    subtitle: '가정용 생필품 선물세트 10명 동시 추첨',
    totalCount: 10,
    slots: makeRepeatedSlots('necessities_2', '생필품', 10),
  },
  {
    id: 'voucher',
    title: '문화상품권 10,000원',
    shortTitle: '문화상품권 (10명)',
    subtitle: '문화상품권 10,000원권 10명 동시 추첨',
    totalCount: 10,
    slots: makeRepeatedSlots('voucher', '문화상품권 10,000원', 10),
  },
];

export const PRIZE_MENU_MAP: Record<PrizeMenu['id'], PrizeMenu> = {
  combo: PRIZE_MENUS[0],
  necessities_1: PRIZE_MENUS[1],
  necessities_2: PRIZE_MENUS[2],
  voucher: PRIZE_MENUS[3],
};
