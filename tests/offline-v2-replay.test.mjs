import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV2OfflineSetOperation,planV2OfflineSetReplay} from '../offline-v2-replay.js';
const op=()=>makeV2OfflineSetOperation({id:'op-1',sessionId:'session',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:0});
const remote=revision=>({index:0,sessionId:'session',revision,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]});
test('V2 offline replay accepts matching revision',()=>{
 assert.deepEqual(planV2OfflineSetReplay(op(),remote(0)),{status:'ready',expectedRevision:0,expectedCompletedAt:null});
});
test('V2 offline replay detects remote edit even if series was unmarked',()=>{
 assert.deepEqual(planV2OfflineSetReplay(op(),remote(2)),{status:'conflict',reason:'remote-revision-changed'});
});
test('V2 offline replay refuses wrong session',()=>{
 assert.throws(()=>planV2OfflineSetReplay(op(),{...remote(0),sessionId:'other'}),/incorreto/);
});
