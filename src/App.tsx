import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminModal } from './components/AdminModal';
import { CelebrationCanvas } from './components/CelebrationCanvas';
import { DrawStage } from './components/DrawStage';
import { SnowfallOverlay } from './components/SnowfallOverlay';
import { TopBar } from './components/TopBar';
import { PRIZE_MENUS, PRIZE_MENU_MAP } from './data/prizeMenus';
import { auth, googleProvider } from './firebase';
import {
  cancelWinnerInFirestore,
  commitDrawBatchToFirestore,
  ensureEventDocument,
  getEventIdForUser,
  resetEventInFirestore,
  saveConfigToFirestore,
  subscribeToRaffleEvent,
} from './services/raffleFirestore';
import {
  HistoryEntry,
  PrizeMenu,
  PrizeMenuId,
  PrizeSlot,
  RaffleState,
  WinnerRecord,
} from './types/raffle';
import {
  createRecordId,
  getDigitLength,
  getEligibleNumbersForMenu,
  INITIAL_STATE,
  pickRandomNumbers,
} from './utils/raffleEngine';
import {
  playCelebrationFanfare,
  playDigitRevealSound,
} from './utils/sound';

const STORAGE_KEY = 'suwon_rehab_raffle_2026_v1';

function loadSavedState(): RaffleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<RaffleState>;
    if (!parsed || !parsed.config || !Array.isArray(parsed.winners)) {
      return INITIAL_STATE;
    }
    return {
      config: {
        minNumber: Math.max(1, Number(parsed.config.minNumber) || 1),
        maxNumber: Math.max(1, Number(parsed.config.maxNumber) || 218),
        excludedNumbers: Array.isArray(parsed.config.excludedNumbers)
          ? parsed.config.excludedNumbers
          : [],
      },
      winners: parsed.winners,
      historyLog: Array.isArray(parsed.historyLog) ? parsed.historyLog : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export default function App() {
  const [raffleState, setRaffleState] = useState<RaffleState>(loadSavedState);
  const [activeMenuId, setActiveMenuId] = useState<PrizeMenuId>('necessities_1');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Firebase Auth & Sync state (kept in background & AdminModal)
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [firebaseConnecting, setFirebaseConnecting] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Tracks how many digits from the right are revealed per slotId during an active draw
  const [slotRevealProgress, setSlotRevealProgress] = useState<
    Record<string, number>
  >({});
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const [justCompletedSlotIds, setJustCompletedSlotIds] = useState<string[]>(
    []
  );

  const revealTimersRef = useRef<number[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Keep a ref of current local state for initial migration when signing into Firebase
  const raffleStateRef = useRef(raffleState);
  raffleStateRef.current = raffleState;

  // Persist state in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raffleState));
    } catch {
      // Ignore storage quota issues
    }
  }, [raffleState]);

  // Listen to browser fullscreen changes (e.g. Esc key)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if browser/iframe restricts fullscreen API
    }
  }, []);

  // Listen to Firebase Auth state and subscribe to Firestore when verified
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let isMounted = true;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!isMounted) return;
      setAuthUser(user);
      setFirebaseError(null);

      if (user && user.emailVerified) {
        const eventId = getEventIdForUser(user);
        try {
          const snapshot = raffleStateRef.current;
          await ensureEventDocument(
            eventId,
            user,
            snapshot.config,
            snapshot.winners,
            snapshot.historyLog
          );
          if (!isMounted) return;

          unsubFirestore = subscribeToRaffleEvent(
            eventId,
            (cloudConfig) => {
              setRaffleState((prev) => ({
                ...prev,
                config: cloudConfig,
              }));
            },
            (cloudWinners) => {
              setRaffleState((prev) => ({
                ...prev,
                winners: cloudWinners,
              }));
            },
            (cloudHistory) => {
              setRaffleState((prev) => ({
                ...prev,
                historyLog: cloudHistory,
              }));
            },
            (err) => {
              setFirebaseError(err.message);
            }
          );
        } catch (err) {
          if (isMounted) {
            setFirebaseError(
              err instanceof Error ? err.message : 'Firebase 동기화 오류'
            );
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleConnectFirebase = useCallback(async () => {
    setFirebaseConnecting(true);
    setFirebaseError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setFirebaseError(
        err instanceof Error
          ? `Google 로그인 연결에 실패했습니다 (${err.message})`
          : 'Google 로그인 연결에 실패했습니다.'
      );
    } finally {
      setFirebaseConnecting(false);
    }
  }, []);

  const handleDisconnectFirebase = useCallback(async () => {
    try {
      await signOut(auth);
      setFirebaseError(null);
    } catch (err) {
      setFirebaseError(
        err instanceof Error ? err.message : '로그아웃에 실패했습니다.'
      );
    }
  }, []);

  const isFirebaseConnected = Boolean(authUser && authUser.emailVerified);
  const activeEventId = authUser ? getEventIdForUser(authUser) : null;

  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearRevealTimers();
  }, [clearRevealTimers]);

  const totalDigits = getDigitLength(raffleState.config.maxNumber);

  const isAnyRevealing = useMemo(() => {
    return Object.values(slotRevealProgress).some(
      (revealed) => revealed < totalDigits
    );
  }, [slotRevealProgress, totalDigits]);

  const triggerDigitRevealSequence = useCallback(
    (slotIds: string[], digitCount: number) => {
      clearRevealTimers();
      setJustCompletedSlotIds([]);

      // Step 0: Start all digits spinning/rolling briefly (0.6s drumroll)
      setSlotRevealProgress((prev) => {
        const next = { ...prev };
        slotIds.forEach((id) => {
          next[id] = 0;
        });
        return next;
      });

      const initialSpinMs = 600;

      // Step 1 (Ones digit, e.g. '8' in '098') locks in first, then +2s per digit
      // Firework sound plays only upon completion
      for (let step = 1; step <= digitCount; step += 1) {
        const delayMs = initialSpinMs + (step - 1) * 2000;
        const timerId = window.setTimeout(() => {
          setSlotRevealProgress((prev) => {
            const next = { ...prev };
            slotIds.forEach((id) => {
              next[id] = step;
            });
            return next;
          });

          if (step === digitCount) {
            setJustCompletedSlotIds(slotIds);
            setCelebrationTrigger((c) => c + 1);
            playCelebrationFanfare(soundEnabledRef.current);
          } else {
            playDigitRevealSound(step, soundEnabledRef.current);
          }
        }, delayMs);

        revealTimersRef.current.push(timerId);
      }
    },
    [clearRevealTimers]
  );

  const handleRevealAllNow = useCallback(() => {
    clearRevealTimers();
    const revealingIds: string[] = [];
    setSlotRevealProgress((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([id, val]) => {
        if (val < totalDigits) revealingIds.push(id);
        next[id] = totalDigits;
      });
      return next;
    });
    if (revealingIds.length > 0) {
      setJustCompletedSlotIds(revealingIds);
      setCelebrationTrigger((c) => c + 1);
    }
    playCelebrationFanfare(soundEnabledRef.current);
  }, [clearRevealTimers, totalDigits]);

  const activeMenu = PRIZE_MENU_MAP[activeMenuId];

  const eligibleNumbers = useMemo(
    () =>
      getEligibleNumbersForMenu(
        raffleState.config,
        raffleState.winners,
        activeMenuId
      ),
    [raffleState.config, raffleState.winners, activeMenuId]
  );

  const completedMenuIds = useMemo(() => {
    const done = new Set<PrizeMenuId>();
    PRIZE_MENUS.forEach((m) => {
      const menuWinnerCount = raffleState.winners.filter(
        (w) => w.menuId === m.id
      ).length;
      if (menuWinnerCount >= m.totalCount) {
        done.add(m.id);
      }
    });
    return done;
  }, [raffleState.winners]);

  const activeMenuWinners = useMemo(
    () => raffleState.winners.filter((w) => w.menuId === activeMenuId),
    [raffleState.winners, activeMenuId]
  );

  // Draw all slots for a menu (never picking duplicates from other menus)
  const handleStartDrawMenu = useCallback(
    (menu: PrizeMenu) => {
      const otherWinners = raffleState.winners.filter(
        (w) => w.menuId !== menu.id
      );
      const oldMenuWinners = raffleState.winners.filter(
        (w) => w.menuId === menu.id
      );
      const pool = getEligibleNumbersForMenu(
        raffleState.config,
        otherWinners,
        menu.id
      );

      if (pool.length < menu.totalCount) return;

      const pickedNumbers = pickRandomNumbers(pool, menu.totalCount);
      const nowIso = new Date().toISOString();

      const newWinners: WinnerRecord[] = menu.slots.map((slot, index) => ({
        id: createRecordId(),
        slotId: slot.slotId,
        menuId: menu.id,
        menuTitle: menu.title,
        prizeName: slot.prizeName,
        slotLabel: slot.slotLabel,
        ticketNumber: pickedNumbers[index],
        drawnAt: nowIso,
        isRedraw: oldMenuWinners.length > 0,
      }));

      const oldWinnerIds = new Set(oldMenuWinners.map((w) => w.id));
      const existingSlotIds = new Set(raffleState.winners.map((w) => w.slotId));

      const updatedHistory: HistoryEntry[] = [
        ...raffleState.historyLog.map((entry) =>
          oldWinnerIds.has(entry.id)
            ? { ...entry, status: 'replaced' as const }
            : entry
        ),
        ...newWinners.map((w) => ({ ...w, status: 'active' as const })),
      ];

      setRaffleState((prev) => ({
        ...prev,
        winners: [...otherWinners, ...newWinners],
        historyLog: updatedHistory,
      }));

      if (isFirebaseConnected && authUser && activeEventId) {
        const replacedHistIds = raffleState.historyLog
          .filter((entry) => oldWinnerIds.has(entry.id))
          .map((entry) => entry.id);
        commitDrawBatchToFirestore(
          activeEventId,
          authUser.uid,
          replacedHistIds,
          existingSlotIds,
          newWinners
        ).catch((err) => {
          setFirebaseError(
            err instanceof Error ? err.message : 'Firebase 저장 오류'
          );
        });
      }

      triggerDigitRevealSequence(
        menu.slots.map((s) => s.slotId),
        totalDigits
      );
    },
    [
      raffleState,
      totalDigits,
      triggerDigitRevealSequence,
      isFirebaseConnected,
      authUser,
      activeEventId,
    ]
  );

  // Selective redraw for 1 or multiple checked slots (excludes replaced tickets)
  const handleRedrawSelectedSlots = useCallback(
    (targetSlots: PrizeSlot[]) => {
      if (targetSlots.length === 0) return;

      const targetSlotIdSet = new Set(targetSlots.map((s) => s.slotId));
      const replacedWinners = raffleState.winners.filter((w) =>
        targetSlotIdSet.has(w.slotId)
      );
      const remainingWinners = raffleState.winners.filter(
        (w) => !targetSlotIdSet.has(w.slotId)
      );

      const replacedTicketNumbers = replacedWinners.map((w) => w.ticketNumber);
      const menuId = targetSlots[0].menuId;
      const pool = getEligibleNumbersForMenu(
        raffleState.config,
        remainingWinners,
        menuId,
        replacedTicketNumbers
      );

      if (pool.length < targetSlots.length) return;

      const pickedNumbers = pickRandomNumbers(pool, targetSlots.length);
      const nowIso = new Date().toISOString();

      const newWinners: WinnerRecord[] = targetSlots.map((slot, idx) => {
        const menu = PRIZE_MENU_MAP[slot.menuId];
        return {
          id: createRecordId(),
          slotId: slot.slotId,
          menuId: slot.menuId,
          menuTitle: menu.title,
          prizeName: slot.prizeName,
          slotLabel: slot.slotLabel,
          ticketNumber: pickedNumbers[idx],
          drawnAt: nowIso,
          isRedraw: true,
        };
      });

      const replacedIds = new Set(replacedWinners.map((w) => w.id));
      const existingSlotIds = new Set(raffleState.winners.map((w) => w.slotId));
      const nextExcluded = Array.from(
        new Set([...raffleState.config.excludedNumbers, ...replacedTicketNumbers])
      );
      const nextConfig = {
        ...raffleState.config,
        excludedNumbers: nextExcluded,
      };

      setRaffleState((prev) => {
        const nextHistory: HistoryEntry[] = [
          ...prev.historyLog.map((entry) =>
            replacedIds.has(entry.id)
              ? { ...entry, status: 'replaced' as const }
              : entry
          ),
          ...newWinners.map((w) => ({ ...w, status: 'active' as const })),
        ];

        return {
          config: nextConfig,
          winners: [...remainingWinners, ...newWinners],
          historyLog: nextHistory,
        };
      });

      if (isFirebaseConnected && authUser && activeEventId) {
        const replacedHistIds = raffleState.historyLog
          .filter((entry) => replacedIds.has(entry.id))
          .map((entry) => entry.id);
        commitDrawBatchToFirestore(
          activeEventId,
          authUser.uid,
          replacedHistIds,
          existingSlotIds,
          newWinners,
          nextConfig
        ).catch((err) => {
          setFirebaseError(
            err instanceof Error ? err.message : 'Firebase 저장 오류'
          );
        });
      }

      triggerDigitRevealSequence(
        targetSlots.map((s) => s.slotId),
        totalDigits
      );
    },
    [
      raffleState,
      totalDigits,
      triggerDigitRevealSequence,
      isFirebaseConnected,
      authUser,
      activeEventId,
    ]
  );

  // Single-slot redraw convenience handler
  const handleRedrawSlot = useCallback(
    (slot: PrizeSlot) => {
      handleRedrawSelectedSlots([slot]);
    },
    [handleRedrawSelectedSlots]
  );

  // Admin: update participant ticket range (default 1 ~ 218)
  const handleUpdateRange = useCallback(
    (minNumber: number, maxNumber: number) => {
      const nextConfig = {
        minNumber,
        maxNumber,
        excludedNumbers: raffleState.config.excludedNumbers.filter(
          (n) => n >= minNumber && n <= maxNumber
        ),
      };
      setRaffleState((prev) => ({
        ...prev,
        config: nextConfig,
      }));
      if (isFirebaseConnected && activeEventId) {
        saveConfigToFirestore(activeEventId, nextConfig).catch((err) => {
          setFirebaseError(
            err instanceof Error ? err.message : 'Firebase 저장 오류'
          );
        });
      }
    },
    [raffleState.config.excludedNumbers, isFirebaseConnected, activeEventId]
  );

  // Admin: toggle exclusion on an individual ticket number
  const handleToggleExcludeNumber = useCallback(
    (num: number) => {
      const exists = raffleState.config.excludedNumbers.includes(num);
      const nextExcluded = exists
        ? raffleState.config.excludedNumbers.filter((n) => n !== num)
        : [...raffleState.config.excludedNumbers, num];

      const nextConfig = {
        ...raffleState.config,
        excludedNumbers: nextExcluded,
      };

      setRaffleState((prev) => ({
        ...prev,
        config: nextConfig,
      }));

      if (isFirebaseConnected && activeEventId) {
        saveConfigToFirestore(activeEventId, nextConfig).catch((err) => {
          setFirebaseError(
            err instanceof Error ? err.message : 'Firebase 저장 오류'
          );
        });
      }
    },
    [raffleState.config, isFirebaseConnected, activeEventId]
  );

  // Admin: restore all excluded numbers
  const handleRestoreAllExcluded = useCallback(() => {
    const nextConfig = {
      ...raffleState.config,
      excludedNumbers: [],
    };
    setRaffleState((prev) => ({
      ...prev,
      config: nextConfig,
    }));
    if (isFirebaseConnected && activeEventId) {
      saveConfigToFirestore(activeEventId, nextConfig).catch((err) => {
        setFirebaseError(
          err instanceof Error ? err.message : 'Firebase 저장 오류'
        );
      });
    }
  }, [raffleState.config, isFirebaseConnected, activeEventId]);

  // Admin: cancel a specific winner record and return the number to eligible pool
  const handleCancelWinner = useCallback(
    (winnerId: string) => {
      const target = raffleState.winners.find((w) => w.id === winnerId);
      setRaffleState((prev) => ({
        ...prev,
        winners: prev.winners.filter((w) => w.id !== winnerId),
        historyLog: prev.historyLog.map((entry) =>
          entry.id === winnerId
            ? { ...entry, status: 'cancelled' as const }
            : entry
        ),
      }));
      if (isFirebaseConnected && activeEventId && target) {
        cancelWinnerInFirestore(activeEventId, target.slotId, winnerId).catch(
          (err) => {
            setFirebaseError(
              err instanceof Error ? err.message : 'Firebase 취소 오류'
            );
          }
        );
      }
    },
    [raffleState.winners, isFirebaseConnected, activeEventId]
  );

  // Admin: full reset
  const handleFullReset = useCallback(() => {
    clearRevealTimers();
    setSlotRevealProgress({});
    setJustCompletedSlotIds([]);
    const resetConfig = {
      minNumber: raffleState.config.minNumber,
      maxNumber: raffleState.config.maxNumber,
      excludedNumbers: [],
    };
    setRaffleState({
      config: resetConfig,
      winners: [],
      historyLog: [],
    });
    if (isFirebaseConnected && activeEventId) {
      resetEventInFirestore(activeEventId, resetConfig).catch((err) => {
        setFirebaseError(
          err instanceof Error ? err.message : 'Firebase 초기화 오류'
        );
      });
    }
  }, [
    clearRevealTimers,
    raffleState.config.minNumber,
    raffleState.config.maxNumber,
    isFirebaseConnected,
    activeEventId,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EF] text-[#1F1B16] relative">
      <SnowfallOverlay />
      <CelebrationCanvas triggerKey={celebrationTrigger} />

      <TopBar
        menus={PRIZE_MENUS}
        activeMenuId={activeMenuId}
        completedMenuIds={completedMenuIds}
        onSelectMenu={(menuId) => {
          if (isAnyRevealing) {
            handleRevealAllNow();
          }
          setJustCompletedSlotIds([]);
          setActiveMenuId(menuId);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      <div className="flex-1">
        <DrawStage
          menu={activeMenu}
          allMenus={PRIZE_MENUS}
          completedMenuIds={completedMenuIds}
          config={raffleState.config}
          eligibleCount={eligibleNumbers.length}
          menuWinners={activeMenuWinners}
          slotRevealProgress={slotRevealProgress}
          justCompletedSlotIds={justCompletedSlotIds}
          isAnyRevealing={isAnyRevealing}
          soundEnabled={soundEnabled}
          isFullscreen={isFullscreen}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          onToggleFullscreen={handleToggleFullscreen}
          onStartDrawMenu={handleStartDrawMenu}
          onRedrawSlot={handleRedrawSlot}
          onRedrawSelectedSlots={handleRedrawSelectedSlots}
          onRevealAllNow={handleRevealAllNow}
          onSelectMenu={(menuId) => {
            setJustCompletedSlotIds([]);
            setActiveMenuId(menuId);
          }}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      </div>

      {!isFullscreen && (
        <footer className="relative z-10 border-t border-[#EAE0CE] bg-[#FFFDF9]/80 py-2.5 px-4 sm:px-8 text-center">
          <p className="text-xs text-[#786B59]">
            수원시장애인종합복지관 가족 송년의 밤 · 함께 빛나는 어울림
          </p>
        </footer>
      )}

      <AdminModal
        isOpen={isAdminOpen}
        config={raffleState.config}
        winners={raffleState.winners}
        historyLog={raffleState.historyLog}
        eligibleCount={eligibleNumbers.length}
        firebaseUserEmail={authUser?.email ?? null}
        firebaseConnecting={firebaseConnecting}
        firebaseError={firebaseError}
        onConnectFirebase={handleConnectFirebase}
        onDisconnectFirebase={handleDisconnectFirebase}
        onClose={() => setIsAdminOpen(false)}
        onUpdateRange={handleUpdateRange}
        onToggleExcludeNumber={handleToggleExcludeNumber}
        onCancelWinner={handleCancelWinner}
        onRestoreAllExcluded={handleRestoreAllExcluded}
        onFullReset={handleFullReset}
      />
    </div>
  );
}
