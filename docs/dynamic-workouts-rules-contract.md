# Dynamic workout rules — proposed authorization contract (not deployed)

Status: **design only**. The current Firestore catch-all continues to deny all client operations on the three new paths. Do not enable without emulator tests, transaction validation and explicit release approval.

## users/{uid}/workoutPlans/{planId}
- Read/list only if request.auth.uid == uid.
- Create only if planId equals the document id, origin is manual/recommended/example, revision is exactly 1, archived is false, updatedAt equals request.time, name and exercise count are bounded, and all exercises meet the schema. No physical deletion.
- Update only if owner, same id and origin, revision exactly previous + 1, and previous record is not archived. The only permitted transition to archived is false -> true. Once archived, no edits or reactivation.
- Preserve existing snapshots in completed sessions; changing a plan must not rewrite sessions.
- **Important:** Firestore rules cannot safely validate an arbitrarily long exercise list using unrestricted iteration. Define a tested bounded strategy (e.g. fixed maximum with explicit indexed checks, or validated child documents) before granting writes. Client-side validation alone is insufficient.

## users/{uid}/dynamicSessions/{sessionId}
- Read only for owner; never delete.
- Create only for an existing owner plan with matching id/revision and an immutable prescription, valid variable sets encoded as `[{items:[...]}]`, status active, and an atomically claimed active pointer.
- Updates may change completion fields of sets and finish metadata only; id, requestId, planId, planRevision, startedAt and prescription remain immutable. Completed sessions are immutable.
- Enforce bounded sets, payload size and timestamps; reject nested arrays.
- The current repository writes the root document and active pointer together, but has **not** yet proven that Firestore rules enforce both writes as an inseparable unit.

## users/{uid}/dynamicSessionControl/active
- Read only for owner.
- Create/update only in a transaction whose post-state references a valid active session, or clears the pointer while the previously referenced session transitions to completed.
- Allow sessionId null only when clearing after finish. Never allow a pointer to be hijacked by another session while one is active. No deletion.

## Required emulator acceptance tests
1. Owner can create, read, revise and archive a plan; unauthenticated and other users cannot.
2. Reject malformed plans, extra keys, duplicate ids, stale revisions, archived edits, physical deletes.
3. Owner can atomically start one session, preserve its prescription and finish it; reject orphan session and pointer writes.
4. Two concurrent starts: one succeeds, one fails. Repeated finish does not erase a newer pointer.
5. Reject mutated prescription, foreign uid, malformed sets, wrong revision, completed-session edits.
6. Existing V1/V2 emulator tests stay green.
7. Verify an authorized production backup and isolated restore before rollout.

Do not deploy or wire the UI while any gate remains unverified.
