import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPendingReceipt} from '../offline-v2-recovery-assessment.js';
const op={id:'u:v2:1',sessionId:'s',exerciseIndex:1,setIndex:0,baseRevision:0,baseCompletedAt:null};
const remote={sessionId:'s',index:1,revision:1,sets:[{done:true,completedAt:'stamp'},{done:false,completedAt:null}]};
const receipt={id:op.id,sessionId:'s',exerciseIndex:1,setIndex:0,revisionBefore:0,revisionAfter:1,done:true,completedAt:'stamp'};
test('receipt remains only candidate',()=>assert.equal(assessPendingReceipt(op,receipt,remote).status,'candidate-already-applied'));
test('missing receipt needs review',()=>assert.equal(assessPendingReceipt(op,null,remote).status,'manual-review'));
