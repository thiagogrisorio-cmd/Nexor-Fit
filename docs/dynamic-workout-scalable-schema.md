# Scalable dynamic workout plans — schema decision gate

## Confirmed limitation
The isolated inline-list Firestore rule fixture exceeded the Firestore emulator's 1000-expression evaluation budget when validating twelve exercises and all pairwise duplicate IDs (CI runs #1317/#1318). A six-item fixture is retained only as an authorization experiment, not a product limit. The current JS model permits 1–100 exercises.

## Recommended candidate: bounded child exercise documents
- `users/{uid}/workoutPlans/{planId}`: metadata (id, name, origin, revision, archived, exerciseCount, updatedAt). No unbounded exercise array.
- `users/{uid}/workoutPlans/{planId}/exercises/{exerciseId}`: one exercise per document with stable ID, name, muscle group, sets, reps, restSeconds, order and revision.
- Require owner-only reads; deny physical deletes. Validate each child document's fields, size and revision independently. Verify that plan archiving prevents further edits.
- Creation/edit operations spanning many documents cannot be made atomic in a single Firestore transaction beyond platform limits. A proposed `draft -> published -> archived` lifecycle, versioned plan revisions, and immutable published snapshots require dedicated rules and concurrency tests.
- Session creation must snapshot a **fully published immutable revision**, not a partially edited draft. Historical session prescriptions and sets must never change when the source plan changes.
- Duplicate IDs are naturally prevented by document identity, but uniqueness of exercise `order` and complete contiguous ordering across documents needs an explicit strategy; do not assume security rules can query all siblings.
- Recommendations and manually created plans use the same schema, with origin distinguishing their source; no forced A/B/C/D presets.

## Blocking work before activation
1. Prototype child-document rules in a separate emulator fixture, including cross-user and stale-revision denials.
2. Choose publication/commit protocol with failure recovery and offline behavior.
3. Add migration-free adapters between existing inline JS plan objects and versioned child records.
4. Validate transactions, limits, concurrency and immutable historical snapshots in emulator CI.
5. Verify authorized backup and isolated restore, then obtain explicit rollout approval.

No production Firestore rules, legacy workout documents, or existing histories are modified by this decision note.
