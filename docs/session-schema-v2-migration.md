# Session schema V2 — migration plan

Status: **design only; not enabled in the application**.

## Layout

- `users/{uid}/sessions/{sessionId}`: metadata (`schemaVersion: 2`, day, status, timestamps, rest settings, updatedAt), without `sets`.
- `users/{uid}/sessions/{sessionId}/exercises/{index}`: one document for each index 0–11, containing `index`, `sessionId`, two set entries and `updatedAt`.
- `users/{uid}/sessionControl/active`: unchanged active pointer.

## Migration invariants

1. Do not replace V1 reads/writes until the V2 metadata security rule, 12 exercise rules, emulator integration and rollback have passed.
2. A session must never be displayed as complete when any of its 12 exercise documents is missing. Treat partial reads as recoverable errors.
3. A write that changes session status or active pointer must use a Firestore transaction/batch; create 12 exercise documents atomically when starting a V2 session.
4. For V2 set updates, read the metadata and the relevant exercise document in the transaction. Reject changes to completed sessions.
5. Offline queue acknowledgements must occur only after server transaction success, with durable operation IDs for idempotency.
6. Continue reading historical V1 sessions through the existing codec. New V2 sessions use `schemaVersion: 2`; do not silently rewrite V1 documents.
7. Roll out behind an explicit feature flag; retain V1 rollback until a multi-device/offline smoke test passes.

## Known blockers

- Existing V1 rules exceed the Firestore emulator 1000-expression limit when all 24 sets are validated; no deployment of that rule revision.
- V2 parent metadata rule and transactional application integration are not yet implemented.
- Per-exercise rules need successful emulator tests, including cross-account, malformed payload, parent-missing, concurrent edits and retries.
