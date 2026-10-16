import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {saveReceipt,getReceipt} from '../offline-v2-receipts.js';
import {replayV2RebasedGroup} from '../offline-v2-rebased-sync.js';
globalThis.indexedDB=indexedDB;
test('receipt persists after crash before ack and does not prove ownership of remote revision',async()=>{
 const op={id:'crash-user:v2:op',kind:'v2-mark-set',sessionId:'crash-session',exerciseIndex:3,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1};
 const remote={sessionId:'crash-session',index:3,revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]};
 await assert.rejects(replayV2RebasedGroup({operations:[op],readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async()=>{remote.revision=1;remote.sets[0]={done:true,completedAt:'2026-10-16T12:00:00.000Z'};},
  recordReceipt:saveReceipt,acknowledge:async()=>{throw Error('simulated-crash');}}),/simulated-crash/);
 const receipt=await getReceipt(op.id);
 assert.equal(receipt.revisionBefore,0);
 assert.equal(receipt.revisionAfter,1);
 assert.equal(receipt.completedAt,remote.sets[0].completedAt);
});
