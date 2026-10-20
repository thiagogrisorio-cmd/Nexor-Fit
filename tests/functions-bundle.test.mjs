import test from 'node:test';
import assert from 'node:assert/strict';
import {createV2SummaryTriggerHandler} from '../functions/session-v2-summary-trigger.js';
import {summarizeV2CompletedSets} from '../functions/session-v2-summary.js';
test('deployable Functions source imports complete dependency graph',()=>{
 assert.equal(typeof createV2SummaryTriggerHandler,'function');
 const rows=Array.from({length:12},(_,index)=>({index,sessionId:'id',sets:[{done:true,completedAt:null},{done:false,completedAt:null}]}));
 assert.equal(summarizeV2CompletedSets(rows,'id').completedSets,12);
});
