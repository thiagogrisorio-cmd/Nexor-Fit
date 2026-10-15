import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {makeOfflineOperation} from '../offline-operations.js';
import {planOfflineSync} from '../offline-sync-plan.js';
const base=()=>startSession({day:0,id:'session-1',now:1000});
test('offline sync plan replays a series and finish in order',()=>{
 const ops=[
  makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000}),
  makeOfflineOperation({id:'b',sessionId:'session-1',kind:'finish',at:4000})
 ];
 const plan=planOfflineSync(base(),ops);
 assert.equal(plan.status,'ready');
 assert.equal(plan.session.status,'completed');
 assert.equal(plan.session.sets[0][0].done,true);
 assert.deepEqual(plan.operationIds,['a','b']);
});
test('conflicting remote completion never discards offline edits',()=>{
 const remote={...base(),status:'completed',endedAt:new Date(9000).toISOString()};
 const op=makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 assert.equal(planOfflineSync(remote,[op]).status,'conflict');
});
test('replayed finish can be acknowledged after server confirmation',()=>{
 const op=makeOfflineOperation({id:'a',sessionId:'session-1',kind:'finish',at:4000});
 const remote={...base(),status:'completed',endedAt:new Date(4000).toISOString()};
 assert.equal(planOfflineSync(remote,[op]).status,'already-applied');
});
test('mismatched sessions require conflict resolution',()=>{
 const op=makeOfflineOperation({id:'a',sessionId:'other',kind:'finish',at:4000});
 assert.equal(planOfflineSync(base(),[op]).status,'conflict');
});
