import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeV2CompletedSets} from '../session-v2-summary.js';
const rows=()=>Array.from({length:12},(_,index)=>({index,sessionId:'test-session',sets:[{done:index%2===0,completedAt:index%2===0?'2026-10-16T10:00:00.000Z':null},{done:false,completedAt:null}]}));
test('summarizes exactly 24 sets across 12 V2 exercise documents',()=>assert.deepEqual(summarizeV2CompletedSets(rows(),'test-session'),{completedSets:6,totalSets:24}));
test('rejects missing V2 exercise',()=>assert.throws(()=>summarizeV2CompletedSets(rows().slice(1),'test-session'),/incompletos/));
test('rejects duplicate V2 exercise index',()=>{const data=rows();data[11].index=0;assert.throws(()=>summarizeV2CompletedSets(data,'test-session'),/inválido/);});
test('rejects malformed middle V2 set',()=>{const data=rows();data[5].sets[1].done='yes';assert.throws(()=>summarizeV2CompletedSets(data,'test-session'),/inválida/);});
test('rejects wrong session ID',()=>{const data=rows();data[3].sessionId='other';assert.throws(()=>summarizeV2CompletedSets(data,'test-session'),/inválido/);});
