import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession,markSet} from '../workout-session.js';
import {planLegacySessionMigration} from '../session-v2-migration-plan.js';
test('legacy preflight preserves 12 exercises, 24 sets and timestamps without modifying source',()=>{
 const session=markSet(startSession({id:'migration-1',day:0,now:0}),3,1,true,1000);
 const snapshot=structuredClone(session);
 const plan=planLegacySessionMigration(session);
 assert.equal(plan.status,'ready');
 assert.deepEqual(plan.checks,{exerciseCount:12,setCount:24,completedSets:1});
 assert.equal(plan.exercises[3].sets[1].completedAt,session.sets[3][1].completedAt);
 assert.deepEqual(session,snapshot);
});
test('legacy preflight refuses to overwrite existing target',()=>{
 const session=startSession({id:'migration-2',day:0,now:0});
 assert.deepEqual(planLegacySessionMigration(session,{id:session.id}),{status:'conflict',sessionId:session.id,reason:'target-exists'});
});
test('legacy preflight rejects malformed middle exercise',()=>{
 const session=startSession({id:'migration-3',day:0,now:0});
 session.sets[5][0]={done:'invalid',completedAt:null};
 assert.throws(()=>planLegacySessionMigration(session));
});
