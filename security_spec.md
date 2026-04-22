# Security Specification for IVL Textile PWA

## Data Invariants
1. A **User** document must be owned by the authenticated user (`uid == request.auth.uid`).
2. **Clients**, **Riscos**, and **Cortes** must be stored under the `users/{userId}` subcollection where `userId == request.auth.uid`.
3. All write operations must enforce that the `userId` field in the document matches `request.auth.uid`.
4. String fields (name, model, notes, etc.) must have size limits to prevent resource exhaustion.
5. `totalCost` must match the product of its components (verified by server-side logic in rules if possible, but definitely type-checked).
6. Timestamps or dates must follow valid formats.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft (Cross-User Write)**: Attempting to create a client under another user's `userId` path.
2. **Spoofing Ownership**: Creating a document where `userId` field is set to someone else's ID.
3. **Admin Escalation**: Attempting to set an `isAdmin` field (not defined in schema, but good to test rejection of unknown fields).
4. **ID Poisoning**: Injecting a 2KB string as a document ID.
5. **Schema Violation**: Submitting a `Client` without a `name`.
6. **Type Mismatch**: Submitting `meters` as a string instead of a number.
7. **Negative Values**: Submitting a negative `totalCost`.
8. **Malicious Notes**: Submitting a 500KB string in the `notes` field.
9. **Terminal State Bypass**: Attempting to delete a record if it were marked "Locked" (not implemented yet but a good invariant).
10. **Orphaned Write**: Submitting a `Risco` for a `clientId` that doesn't exist (using `exists()` check).
11. **Client Document Injection**: Client ID with special characters like `/` or `..`.
12. **Anonymous Access**: Attempting to read any data without being signed in.

## Test Runner (Firestore Rules Test)

`firestore.rules.test.ts` (Conceptual logic for testing these payloads):
- `test('Anonymous read fails', ...)`
- `test('Cross-user write fails', ...)`
- `test('Valid self-write succeeds', ...)`
- `test('Giant notes fail', ...)`
- `test('Orphaned Risco fails', ...)`
