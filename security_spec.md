# Security Specification — Raffle Firestore Rules

## 1. Data Invariants
1. Every raffle event document under `/events/{eventId}` belongs to an authenticated, email-verified `ownerId` (or bootstrapped admin `hwi@suwonrehab.or.kr`).
2. `minNumber >= 1`, `maxNumber >= minNumber`, and `maxNumber - minNumber <= 2000`.
3. `excludedNumbers` is a bounded list (`<= 2000` items) with integer validation.
4. Subcollection documents under `/events/{eventId}/winners/{slotId}` and `/events/{eventId}/history/{entryId}` cannot exist without a valid parent event document owned by the caller or admin (`Master Gate`).
5. `createdAt` and `ownerId` on `/events/{eventId}` are immutable after creation; `createdAt`/`updatedAt` must match `request.time`.
6. Once a `history` record reaches terminal status (`replaced` or `cancelled`), non-admin writes cannot revert it.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read or write on `/events/suwon-2026-year-end`.
2. Write by user with `email_verified: false` spoofing admin email.
3. Creating `/events/evil` with `ownerId` set to another user's UID.
4. Creating `/events/evil` with shadow field `isAdmin: true` or `bonusFlag: 1`.
5. Creating `/events/evil` with `minNumber: 500, maxNumber: 10` (inverted range).
6. Creating `/events/evil` with 1.5KB string in `title` or invalid characters in `eventId`.
7. Updating `/events/id` to mutate `ownerId` or `createdAt`.
8. Updating `/events/id` with client-forged `updatedAt` != `request.time`.
9. Creating `/events/otherUserEvent/winners/slot1` without owning parent event.
10. Updating `/events/id/winners/slot1` with `ticketNumber: "not-a-number"`.
11. Listing `/events/{eventId}/winners` without ownership/admin filter.
12. Deleting `/events/{eventId}/history/{entryId}` as a non-admin user.
