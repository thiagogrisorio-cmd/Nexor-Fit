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
 assert.equal(result.status,'conflict');assert.equal(result.processed,1);assert.deepEqual(ack,['op0']);
});
test('rejects repeated edits to same set without any writes',async()=>{
 let writes=0;
 const result=await replayV2RebasedGroup({operations:[operations[0],{...operations[1],setIndex:0}],readRemoteExercise:async()=>make(),
  updateRemoteSet:async()=>writes++,acknowledge:async()=>{}});
 assert.equal(result.status,'conflict');assert.equal(writes,0);
});
