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
