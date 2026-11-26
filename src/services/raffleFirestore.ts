import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { HistoryEntry, RaffleConfig, WinnerRecord } from '../types/raffle';

const CANONICAL_ADMIN_EMAIL = 'hwi@suwonrehab.or.kr';
const CANONICAL_EVENT_ID = 'suwon-2026-year-end';
const EVENT_TITLE = "수원시장애인종합복지관 가족 송년의 밤 '함께 빛나는 어울림'";

export function getEventIdForUser(user: User): string {
  if (user.emailVerified && user.email === CANONICAL_ADMIN_EMAIL) {
    return CANONICAL_EVENT_ID;
  }
  return `event-${user.uid}`;
}

function sanitizeExcludedNumbers(
  excluded: number[],
  minNumber: number,
  maxNumber: number
): number[] {
  const unique = new Set<number>();
  excluded.forEach((n) => {
    const intVal = Math.floor(Number(n));
    if (
      !Number.isNaN(intVal) &&
      intVal >= minNumber &&
      intVal <= maxNumber &&
      unique.size < 2000
    ) {
      unique.add(intVal);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
}

export async function ensureEventDocument(
  eventId: string,
  user: User,
  localConfig: RaffleConfig,
  localWinners: WinnerRecord[],
  localHistory: HistoryEntry[]
): Promise<boolean> {
  const eventPath = `events/${eventId}`;
  const eventRef = doc(db, 'events', eventId);

  try {
    const snap = await getDoc(eventRef);
    if (snap.exists()) {
      return false; // Already exists in Firestore; cloud wins
    }

    const minNum = Math.max(1, Math.min(9999, Math.floor(localConfig.minNumber)));
    const maxNum = Math.max(
      minNum,
      Math.min(minNum + 2000, Math.floor(localConfig.maxNumber))
    );

    await setDoc(eventRef, {
      ownerId: user.uid,
      title: EVENT_TITLE,
      minNumber: minNum,
      maxNumber: maxNum,
      excludedNumbers: sanitizeExcludedNumbers(
        localConfig.excludedNumbers,
        minNum,
        maxNum
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (localWinners.length > 0 || localHistory.length > 0) {
      const batch = writeBatch(db);
      localWinners.forEach((w) => {
        const winnerRef = doc(db, 'events', eventId, 'winners', w.slotId);
        batch.set(winnerRef, {
          id: w.id,
          slotId: w.slotId,
          menuId: w.menuId,
          menuTitle: w.menuTitle.slice(0, 80),
          prizeName: w.prizeName.slice(0, 80),
          slotLabel: w.slotLabel.slice(0, 80),
          ticketNumber: Math.floor(w.ticketNumber),
          drawnAt: w.drawnAt.slice(0, 64),
          isRedraw: Boolean(w.isRedraw),
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        });
      });

      localHistory.slice(-200).forEach((h) => {
        const histRef = doc(db, 'events', eventId, 'history', h.id);
        batch.set(histRef, {
          id: h.id,
          slotId: h.slotId,
          menuId: h.menuId,
          menuTitle: h.menuTitle.slice(0, 80),
          prizeName: h.prizeName.slice(0, 80),
          slotLabel: h.slotLabel.slice(0, 80),
          ticketNumber: Math.floor(h.ticketNumber),
          drawnAt: h.drawnAt.slice(0, 64),
          isRedraw: Boolean(h.isRedraw),
          status: h.status,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, eventPath);
  }
}

export function subscribeToRaffleEvent(
  eventId: string,
  onConfig: (config: RaffleConfig) => void,
  onWinners: (winners: WinnerRecord[]) => void,
  onHistory: (history: HistoryEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const eventPath = `events/${eventId}`;
  const winnersPath = `events/${eventId}/winners`;
  const historyPath = `events/${eventId}/history`;

  const unsubEvent = onSnapshot(
    doc(db, 'events', eventId),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      onConfig({
        minNumber: Number(data.minNumber) || 1,
        maxNumber: Number(data.maxNumber) || 218,
        excludedNumbers: Array.isArray(data.excludedNumbers)
          ? data.excludedNumbers.map(Number)
          : [],
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, eventPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubWinners = onSnapshot(
    collection(db, 'events', eventId, 'winners'),
    (snapshot) => {
      const list: WinnerRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id),
          slotId: String(data.slotId),
          menuId: data.menuId,
          menuTitle: String(data.menuTitle),
          prizeName: String(data.prizeName),
          slotLabel: String(data.slotLabel),
          ticketNumber: Number(data.ticketNumber),
          drawnAt: String(data.drawnAt),
          isRedraw: Boolean(data.isRedraw),
        };
      });
      onWinners(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, winnersPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubHistory = onSnapshot(
    query(
      collection(db, 'events', eventId, 'history'),
      orderBy('createdAt', 'asc')
    ),
    (snapshot) => {
      const list: HistoryEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id),
          slotId: String(data.slotId),
          menuId: data.menuId,
          menuTitle: String(data.menuTitle),
          prizeName: String(data.prizeName),
          slotLabel: String(data.slotLabel),
          ticketNumber: Number(data.ticketNumber),
          drawnAt: String(data.drawnAt),
          isRedraw: Boolean(data.isRedraw),
          status: data.status,
        };
      });
      onHistory(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, historyPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubEvent();
    unsubWinners();
    unsubHistory();
  };
}

export async function saveConfigToFirestore(
  eventId: string,
  config: RaffleConfig
): Promise<void> {
  const path = `events/${eventId}`;
  const minNum = Math.max(1, Math.min(9999, Math.floor(config.minNumber)));
  const maxNum = Math.max(
    minNum,
    Math.min(minNum + 2000, Math.floor(config.maxNumber))
  );

  try {
    await updateDoc(doc(db, 'events', eventId), {
      minNumber: minNum,
      maxNumber: maxNum,
      excludedNumbers: sanitizeExcludedNumbers(
        config.excludedNumbers,
        minNum,
        maxNum
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function commitDrawBatchToFirestore(
  eventId: string,
  ownerId: string,
  replacedHistoryIds: string[],
  existingSlotIds: Set<string>,
  newWinners: WinnerRecord[],
  updatedConfig?: RaffleConfig
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const batch = writeBatch(db);

    if (updatedConfig) {
      const minNum = Math.max(
        1,
        Math.min(9999, Math.floor(updatedConfig.minNumber))
      );
      const maxNum = Math.max(
        minNum,
        Math.min(minNum + 2000, Math.floor(updatedConfig.maxNumber))
      );
      batch.update(doc(db, 'events', eventId), {
        excludedNumbers: sanitizeExcludedNumbers(
          updatedConfig.excludedNumbers,
          minNum,
          maxNum
        ),
        updatedAt: serverTimestamp(),
      });
    }

    replacedHistoryIds.forEach((histId) => {
      const histRef = doc(db, 'events', eventId, 'history', histId);
      batch.update(histRef, { status: 'replaced' });
    });

    newWinners.forEach((w) => {
      const winnerRef = doc(db, 'events', eventId, 'winners', w.slotId);
      if (existingSlotIds.has(w.slotId)) {
        batch.update(winnerRef, {
          id: w.id,
          ticketNumber: Math.floor(w.ticketNumber),
          drawnAt: w.drawnAt.slice(0, 64),
          isRedraw: Boolean(w.isRedraw),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(winnerRef, {
          id: w.id,
          slotId: w.slotId,
          menuId: w.menuId,
          menuTitle: w.menuTitle.slice(0, 80),
          prizeName: w.prizeName.slice(0, 80),
          slotLabel: w.slotLabel.slice(0, 80),
          ticketNumber: Math.floor(w.ticketNumber),
          drawnAt: w.drawnAt.slice(0, 64),
          isRedraw: Boolean(w.isRedraw),
          ownerId,
          updatedAt: serverTimestamp(),
        });
      }

      const histRef = doc(db, 'events', eventId, 'history', w.id);
      batch.set(histRef, {
        id: w.id,
        slotId: w.slotId,
        menuId: w.menuId,
        menuTitle: w.menuTitle.slice(0, 80),
        prizeName: w.prizeName.slice(0, 80),
        slotLabel: w.slotLabel.slice(0, 80),
        ticketNumber: Math.floor(w.ticketNumber),
        drawnAt: w.drawnAt.slice(0, 64),
        isRedraw: Boolean(w.isRedraw),
        status: 'active',
        ownerId,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function cancelWinnerInFirestore(
  eventId: string,
  slotId: string,
  winnerId: string
): Promise<void> {
  const path = `events/${eventId}/winners/${slotId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'events', eventId, 'winners', slotId));
    batch.update(doc(db, 'events', eventId, 'history', winnerId), {
      status: 'cancelled',
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function resetEventInFirestore(
  eventId: string,
  config: RaffleConfig
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const [winnersSnap, historySnap] = await Promise.all([
      getDocs(collection(db, 'events', eventId, 'winners')),
      getDocs(collection(db, 'events', eventId, 'history')),
    ]);

    const refsToDelete = [
      ...winnersSnap.docs.map((d) => d.ref),
      ...historySnap.docs.map((d) => d.ref),
    ];

    // Commit deletes in safe chunks (< 450 per batch)
    for (let i = 0; i < refsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await updateDoc(doc(db, 'events', eventId), {
      excludedNumbers: [],
      minNumber: Math.max(1, Math.min(9999, Math.floor(config.minNumber))),
      maxNumber: Math.max(1, Math.min(9999, Math.floor(config.maxNumber))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
