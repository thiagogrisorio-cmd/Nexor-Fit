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

test('recovers from crash after remote commit of multiple edits and finish',()=>{
 const ops=[
  makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000}),
  makeOfflineOperation({id:'b',sessionId:'session-1',kind:'mark-set',exercise:0,set:1,done:true,at:3000}),
  makeOfflineOperation({id:'c',sessionId:'session-1',kind:'finish',at:4000})
 ];
 const first=planOfflineSync(base(),ops);
 assert.equal(first.status,'ready');
 assert.equal(planOfflineSync(first.session,ops).status,'already-applied');
 assert.deepEqual(planOfflineSync(first.session,ops).operationIds,['a','b','c']);
});
test('recovers from crash after active session set commit',()=>{
 const op=makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 const first=planOfflineSync(base(),[op]);
 assert.equal(planOfflineSync(first.session,[op]).status,'already-applied');
});
test('does not acknowledge coincidental completed time when a set differs',()=>{
 const ops=[
  makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000}),
  makeOfflineOperation({id:'b',sessionId:'session-1',kind:'finish',at:4000})
 ];
 const remote={...base(),status:'completed',endedAt:new Date(4000).toISOString()};
 assert.equal(planOfflineSync(remote,ops).status,'conflict');
});
test('does not acknowledge active session edits with a different timestamp',()=>{
 const op=makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 const remote=planOfflineSync(base(),[op]).session;
 remote.sets[0][0].completedAt=new Date(5000).toISOString();
 assert.equal(planOfflineSync(remote,[op]).status,'conflict');
});

test('concurrent remote completion of same set requires review',()=>{
 const remote=base();
 remote.sets[0][0]={done:true,completedAt:new Date(3500).toISOString()};
 const op=makeOfflineOperation({id:'local',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 assert.equal(planOfflineSync(remote,[op]).reason,'concurrent-set-change');
});
test('nonoverlapping remote edits are preserved',()=>{
 const remote=base();
 remote.sets[1][0]={done:true,completedAt:new Date(1500).toISOString()};
 const op=makeOfflineOperation({id:'local',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 const result=planOfflineSync(remote,[op]);
 assert.equal(result.status,'ready');
 assert.equal(result.session.sets[1][0].done,true);
 assert.equal(result.session.sets[0][0].done,true);
});
