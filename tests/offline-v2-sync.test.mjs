import test from 'node:test';
import assert from 'node:assert/strict';
import {syncV2OfflineOperation} from '../offline-v2-sync.js';
const operation={id:'op',sessionId:'s',kind:'v2-mark-set',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null};
const remote=revision=>({index:0,sessionId:'s',revision,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]});
test('V2 acknowledges offline mutation only after server write',async()=>{
 const calls=[];
 let reads=0;
 const result=await syncV2OfflineOperation({operation,readRemoteExercise:async()=>{reads++;return reads===1?remote(0):{...remote(1),sets:[{done:true,completedAt:'2026-10-18T12:00:00.000Z'},{done:false,completedAt:null}]};},updateRemoteSet:async()=>calls.push('write'),acknowledge:async()=>calls.push('ack')});
 assert.equal(result.status,'synced');assert.equal(reads,2);assert.deepEqual(calls,['write','ack']);
});
test('V2 retains offline mutation after revision conflict',async()=>{
 let acknowledged=false;
 const result=await syncV2OfflineOperation({operation,readRemoteExercise:async()=>remote(1),updateRemoteSet:async()=>{},acknowledge:async()=>{acknowledged=true;}});
 assert.equal(result.status,'conflict');assert.equal(acknowledged,false);
});
test('V2 retains offline mutation after network failure',async()=>{
 let acknowledged=false;
 await assert.rejects(syncV2OfflineOperation({operation,readRemoteExercise:async()=>remote(0),updateRemoteSet:async()=>{throw Error('offline');},acknowledge:async()=>{acknowledged=true;}}),/offline/);
 assert.equal(acknowledged,false);
});

test('V2 preserves pending operation if remote confirmation differs',async()=>{
 let acknowledged=false,reads=0;
 const result=await syncV2OfflineOperation({operation,
  readRemoteExercise:async()=>{reads++;return reads===1?remote(0):remote(1);},
  updateRemoteSet:async()=>{},acknowledge:async()=>{acknowledged=true;}
 });
 assert.equal(result.status,'conflict');
 assert.equal(result.reason,'confirmation-mismatch');
 assert.equal(acknowledged,false);
});
