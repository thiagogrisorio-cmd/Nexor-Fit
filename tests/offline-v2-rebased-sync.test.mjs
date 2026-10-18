import test from 'node:test';
import assert from 'node:assert/strict';
import {replayV2RebasedGroup} from '../offline-v2-rebased-sync.js';
const operations=[0,1].map(i=>({id:'op'+i,sessionId:'s',exerciseIndex:2,setIndex:i,done:true,kind:'v2-mark-set',baseRevision:4,baseCompletedAt:null,at:i}));
const make=()=>({sessionId:'s',index:2,revision:4,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]});
test('replays two independent sets and acknowledges each after remote success',async()=>{
 const remote=make(),ack=[];
 const result=await replayV2RebasedGroup({operations,readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async op=>{assert.equal(op.expectedRevision,remote.revision);remote.revision++;remote.sets[op.setIndex]={done:true,completedAt:'done'};},
  acknowledge:async id=>ack.push(id)});
 assert.equal(result.status,'synced');assert.equal(result.processed,2);assert.deepEqual(ack,['op0','op1']);
});
test('preserves second operation when remote changes between steps',async()=>{
 const remote=make(),ack=[];
 const result=await replayV2RebasedGroup({operations,readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async op=>{remote.revision+=2;remote.sets[op.setIndex]={done:true,completedAt:'done'};},
  acknowledge:async id=>ack.push(id)});
 assert.equal(result.status,'conflict');assert.equal(result.processed,0);assert.deepEqual(ack,[]);
});
test('rejects repeated edits to same set without any writes',async()=>{
 let writes=0;
 const result=await replayV2RebasedGroup({operations:[operations[0],{...operations[1],setIndex:0}],readRemoteExercise:async()=>make(),
  updateRemoteSet:async()=>writes++,acknowledge:async()=>{}});
 assert.equal(result.status,'conflict');assert.equal(writes,0);
});

test('records confirmed remote revision before acknowledging queued edit',async()=>{
 const remote=make(),events=[];
 const result=await replayV2RebasedGroup({operations,readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async op=>{remote.revision++;remote.sets[op.setIndex]={done:true,completedAt:'2026-10-16T12:00:00.000Z'};},
  recordReceipt:async receipt=>{assert.equal(receipt.revisionAfter,receipt.revisionBefore+1);events.push('receipt:'+receipt.id);},
  acknowledge:async id=>events.push('ack:'+id)});
 assert.equal(result.status,'synced');
 assert.deepEqual(events,['receipt:op0','ack:op0','receipt:op1','ack:op1']);
});

test('crash after receipt but before acknowledgement keeps operation unacknowledged',async()=>{
 const remote=make(),receipts=[],ack=[];
 await assert.rejects(replayV2RebasedGroup({operations,
  readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async op=>{remote.revision++;remote.sets[op.setIndex]={done:true,completedAt:'2026-10-16T12:00:00.000Z'};},
  recordReceipt:async receipt=>receipts.push(receipt),
  acknowledge:async id=>{throw Error('app terminated before queue acknowledgement');}
 }),/app terminated/);
 assert.equal(receipts.length,1);
 assert.equal(receipts[0].id,'op0');
 assert.equal(remote.revision,5);
 assert.deepEqual(ack,[]);
});

test('sequential replay preserves queue when remote confirmation fails without receipt writer',async()=>{
 const remote=make(),ack=[];
 const result=await replayV2RebasedGroup({operations,readRemoteExercise:async()=>structuredClone(remote),
  updateRemoteSet:async()=>{},acknowledge:async id=>ack.push(id)});
 assert.equal(result.status,'conflict');
 assert.equal(result.reason,'confirmation-mismatch');
 assert.deepEqual(ack,[]);
});
