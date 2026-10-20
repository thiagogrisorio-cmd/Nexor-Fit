import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPendingReceipt} from '../offline-v2-recovery-assessment.js';
const op={done:true,id:'u:v2:1',sessionId:'s',exerciseIndex:1,setIndex:0,baseRevision:0,baseCompletedAt:null};
const remote={sessionId:'s',index:1,revision:1,sets:[{done:true,completedAt:'stamp'},{done:false,completedAt:null}]};
const receipt={id:op.id,sessionId:'s',exerciseIndex:1,setIndex:0,revisionBefore:0,revisionAfter:1,done:true,completedAt:'stamp'};
test('receipt remains only candidate',()=>assert.equal(assessPendingReceipt(op,receipt,remote).status,'candidate-already-applied'));
test('missing receipt needs review',()=>assert.equal(assessPendingReceipt(op,null,remote).status,'manual-review'));

test('unchanged incomplete set can be retried when marking done',()=>{
 const before={...remote,revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]};
 assert.equal(assessPendingReceipt({...op,done:true},null,before).status,'safe-to-retry');
});
test('unchanged completed set can be retried when unmarking',()=>{
 const before={...remote,revision:0,sets:[{done:true,completedAt:'stamp'},{done:false,completedAt:null}]};
 assert.equal(assessPendingReceipt({...op,done:false,baseCompletedAt:'stamp'},null,before).status,'safe-to-retry');
});
test('recovery does not retry a no-op set state even when revision and timestamp match',()=>{
 const before={...remote,revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]};
 assert.equal(assessPendingReceipt({...op,done:false},null,before).status,'manual-review');
});
test('recovery rejects malformed completed state without completion timestamp',()=>{
 const before={...remote,revision:0,sets:[{done:true,completedAt:null},{done:false,completedAt:null}]};
 assert.equal(assessPendingReceipt({...op,done:false},null,before).status,'manual-review');
});

test('receipt for opposite operation intent is not considered applied',()=>{
 assert.equal(assessPendingReceipt({...op,done:false},receipt,remote).status,'manual-review');
});
test('receipt cannot skip revisions while claiming the same edit',()=>{
 assert.equal(assessPendingReceipt(op,{...receipt,revisionAfter:2},{...remote,revision:2}).status,'manual-review');
});
test('receipt with malformed completion state requires review',()=>{
 const bad={...remote,sets:[{done:true,completedAt:null},{done:false,completedAt:null}]};
 assert.equal(assessPendingReceipt(op,{...receipt,completedAt:null},bad).status,'manual-review');
});
