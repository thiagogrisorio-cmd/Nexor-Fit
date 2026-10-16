import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {encodeSessionForFirestore} from '../firestore-session-codec.js';
import {planLegacySessionMigration} from '../session-v2-migration-plan.js';
import {assessV2RecoverySafety} from '../session-v2-recovery-safety.js';
const session=startSession({id:'safe-recovery',day:0,now:0});
const plan=planLegacySessionMigration(session);
const make=()=>({sessionId:session.id,backup:{sessionId:session.id,original:encodeSessionForFirestore(session)},parent:structuredClone(plan.metadata),exerciseDocuments:structuredClone(plan.exercises)});
test('unchanged migration may be submitted for privileged review',()=>{
 assert.equal(assessV2RecoverySafety(make()).status,'eligible-for-privileged-restore');
});
test('post-migration revision blocks recovery',()=>{
 const data=make();data.exerciseDocuments[5].revision=1;
 assert.equal(assessV2RecoverySafety(data).reason,'exercise-revision-changed');
});
test('changed series without revision still blocks recovery',()=>{
 const data=make();data.exerciseDocuments[5].sets[0].done=true;
 assert.equal(assessV2RecoverySafety(data).reason,'exercise-content-changed');
});
test('changed session metadata blocks recovery',()=>{
 const data=make();data.parent.status='completed';
 assert.equal(assessV2RecoverySafety(data).reason,'parent-changed');
});
