import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeV2OfflineSetOperation} from '../offline-v2-replay.js';
import {syncV2OfflineOperation} from '../offline-v2-sync.js';
test('V2 operation remains eligible for retry after network failure',async()=>{
 const operation=makeV2OfflineSetOperation({id:'account:v2:op',sessionId:'s',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:0});
 let acknowledged=0;
 const args={operation,readRemoteExercise:async()=>({index:0,sessionId:'s',revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]}),acknowledge:async()=>{acknowledged++;}};
 await assert.rejects(syncV2OfflineOperation({...args,updateRemoteSet:async()=>{throw Error('network');}}),/network/);
 assert.equal(acknowledged,0);
 const result=await syncV2OfflineOperation({...args,updateRemoteSet:async()=>{}});
 assert.equal(result.status,'synced');
 assert.equal(acknowledged,1);
});
