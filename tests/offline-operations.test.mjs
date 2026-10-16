import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession,markSet,finishSession,sessionProgress} from '../workout-session.js';
import {makeOfflineOperation,replayOfflineOperations} from '../offline-operations.js';
const base=()=>startSession({day:0,id:'session-1',now:1000,restSeconds:30});
test('replays offline sets in deterministic order without mutating base',()=>{
 const original=base();
 const operations=[
  makeOfflineOperation({id:'b',sessionId:'session-1',kind:'mark-set',exercise:0,set:1,done:true,at:3000}),
  makeOfflineOperation({id:'a',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000})
 ];
 const result=replayOfflineOperations(original,operations,{markSet,finishSession});
 assert.equal(sessionProgress(result).done,2);
 assert.equal(sessionProgress(original).done,0);
 assert.equal(result.sets[0][0].completedAt,new Date(2000).toISOString());
});
test('deduplicates operations and preserves finish time',()=>{
 const op=makeOfflineOperation({id:'same',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:2000});
 const finish=makeOfflineOperation({id:'finish',sessionId:'session-1',kind:'finish',at:61000});
 const result=replayOfflineOperations(base(),[op,op,finish],{markSet,finishSession});
 assert.equal(result.status,'completed');
 assert.equal(result.durationSeconds,60);
 assert.equal(sessionProgress(result).done,1);
});
test('detects cross-session operations and edits after completion',()=>{
 const op=makeOfflineOperation({id:'wrong',sessionId:'other',kind:'finish',at:3000});
 assert.throws(()=>replayOfflineOperations(base(),[op],{markSet,finishSession}));
 const finish=makeOfflineOperation({id:'finish',sessionId:'session-1',kind:'finish',at:2000});
 const late=makeOfflineOperation({id:'late',sessionId:'session-1',kind:'mark-set',exercise:0,set:0,done:true,at:3000});
 assert.throws(()=>replayOfflineOperations(base(),[finish,late],{markSet,finishSession}));
});
test('rejects invalid offline payloads',()=>{
 assert.throws(()=>makeOfflineOperation({id:'x',sessionId:'session-1',kind:'mark-set',exercise:-1,set:0,done:true}));
 assert.throws(()=>makeOfflineOperation({id:'x',sessionId:'session-1',kind:'delete'}));
});
