# Dynamic workout publication safety protocol — proposal only

## Goal
Never let a dynamic session start from a partially edited plan. The current inline plan repository and session snapshot remain opt-in and are not wired to production.

## Proposed immutable revisions
- `users/{uid}/workoutPlans/{planId}` contains owner-scoped metadata and a pointer `publishedRevision`.
- `users/{uid}/workoutPlans/{planId}/revisions/{revisionId}` contains immutable manifest: revision, expected exercise count, ordered exercise IDs, checksum and publication state.
- `users/{uid}/workoutPlans/{planId}/revisions/{revisionId}/exercises/{exerciseId}` contains validated, immutable prescription records.
- Drafts are written to a **new revision namespace**; the published revision is never edited in place.
- Publish only after verifying all expected child records, uniqueness and contiguous order. This completeness check cannot be trusted to an ordinary client assertion or a simple rule on the parent document. A privileged, authenticated server operation with explicit validation and transactional pointer update is a candidate, requiring security review and emulator tests.
- Session creation resolves exactly one published revision, reads and verifies its complete manifest and children, then snapshots that immutable prescription into the session. Reject incomplete or inconsistent revisions.
- Archive hides a plan from new sessions but retains every published revision and all historical sessions.
- Retry and offline recovery must not accidentally publish incomplete drafts or reuse a stale revision.
- No A/B/C/D default assumption; manual and questionnaire-recommended plans share the same versioned model.

## Required gates
1. Test a versioned manifest and child rules fixture with owner-only access and immutable published children.
2. Define the trusted publication authority, concurrency controls and failure recovery.
3. Add emulator tests for partial drafts, missing children, duplicate order, stale publish, cross-user access and post-publication mutation.
4. Verify no legacy or production paths change and complete backup/restore prerequisites before activation.

This is an architecture proposal, not an authorization to deploy or migrate data.
