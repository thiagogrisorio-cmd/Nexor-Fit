import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectV2RecoveryQueue} from '../offline-v2-recovery-queue.js';
test('requires account scope',async()=>assert.rejects(inspectV2RecoveryQueue({uid:'',readRemoteExercise:async()=>({})}),/Diagnóstico incompleto/));
import {indexedDB} from 'fake-indexeddb';
import {queueV2SetEdit,listPendingV2Edits} from '../offline-v2-queue.js';
globalThis.indexedDB=indexedDB;
test('diagnosis preserves pending operation',async()=>{
 const uid='recovery-queue-unique';
 await queueV2SetEdit({uid,id:'first',sessionId:'s',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1});
 const result=await inspectV2RecoveryQueue({uid,readRemoteExercise:async()=>({sessionId:'s',index:0,revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]})});
 assert.equal(result.total,1);
 assert.equal(result.results[0].status,'safe-to-retry');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});
import {saveReceipt} from '../offline-v2-receipts.js';
test('diagnosis classifies matching receipt but keeps operation pending',async()=>{
 const uid='recovery-receipt-unique',sessionId='receipt-session';
 const op=await queueV2SetEdit({uid,id:'second',sessionId,exerciseIndex:1,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:2});
 await saveReceipt({id:op.id,sessionId,exerciseIndex:1,setIndex:0,revisionBefore:0,revisionAfter:1,done:true,completedAt:'stamp'});
 const result=await inspectV2RecoveryQueue({uid,readRemoteExercise:async()=>({sessionId,index:1,revision:1,sets:[{done:true,completedAt:'stamp'},{done:false,completedAt:null}]})});
 assert.equal(result.results[0].status,'candidate-already-applied');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});
import {summarizeV2Recovery} from '../offline-v2-recovery-summary.js';
test('summary distinguishes safe retry from attention needed',()=>{
 const summary=summarizeV2Recovery({results:[{status:'safe-to-retry'},{status:'manual-review'},{status:'candidate-already-applied'}]});
 assert.equal(summary.counts.retry,1);
 assert.equal(summary.requiresAttention,2);
});

test('after simulated restart, a persisted receipt remains a review candidate',async()=>{
 const uid='restart-recovery-unique',sessionId='restart-recovery-session';
 const op=await queueV2SetEdit({uid,id:'after-crash',sessionId,exerciseIndex:3,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:3});
 await saveReceipt({id:op.id,sessionId,exerciseIndex:3,setIndex:0,revisionBefore:0,revisionAfter:1,done:true,completedAt:'confirmed'});
 const remote={sessionId,index:3,revision:1,sets:[{done:true,completedAt:'confirmed'},{done:false,completedAt:null}]};
 const before=await inspectV2RecoveryQueue({uid,readRemoteExercise:async()=>remote});
 const after=await inspectV2RecoveryQueue({uid,readRemoteExercise:async()=>remote});
 assert.equal(before.results[0].status,'candidate-already-applied');
 assert.equal(after.results[0].status,'candidate-already-applied');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});
