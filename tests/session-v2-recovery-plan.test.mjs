import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {encodeSessionForFirestore} from '../firestore-session-codec.js';
import {planLegacySessionMigration} from '../session-v2-migration-plan.js';
import {inspectV2MigrationBackup} from '../session-v2-recovery-plan.js';
const session=startSession({id:'recovery-one',day:0,now:0});
const plan=planLegacySessionMigration(session);
const input=()=>({sessionId:session.id,backup:{sessionId:session.id,original:encodeSessionForFirestore(session)},parent:plan.metadata,exerciseDocuments:structuredClone(plan.exercises)});
test('recovery inspection is read-only and preserves original workout',()=>{
 const data=input(),snapshot=structuredClone(data);
 const result=inspectV2MigrationBackup(data);
 assert.equal(result.status,'ready-for-manual-review');
 assert.equal(result.checks.setCount,24);
 assert.deepEqual(data,snapshot);
});
test('recovery inspection rejects incomplete child collection',()=>{
 const data=input();data.exerciseDocuments.pop();
 assert.equal(inspectV2MigrationBackup(data).status,'incomplete');
});
test('recovery inspection rejects backup from another session',()=>{
 const data=input();data.backup.sessionId='another';
 assert.equal(inspectV2MigrationBackup(data).status,'invalid-backup');
});
test('recovery inspection blocks automatic downgrade of non-V2 parent',()=>{
 const data=input();data.parent.schemaVersion=1;
 assert.equal(inspectV2MigrationBackup(data).status,'conflict');
});
