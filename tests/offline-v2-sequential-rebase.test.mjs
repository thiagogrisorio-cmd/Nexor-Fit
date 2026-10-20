import test from 'node:test';
import assert from 'node:assert/strict';
import {planV2SequentialRebase} from '../offline-v2-sequential-rebase.js';
const remote={sessionId:'s',index:2,revision:4,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]};
const op=(id,setIndex)=>({id,kind:'v2-mark-set',sessionId:'s',exerciseIndex:2,setIndex,done:true,baseRevision:4,baseCompletedAt:null,at:setIndex});
test('plans independent set edits with sequential revisions',()=>{
 const result=planV2SequentialRebase([op('b',1),op('a',0)],remote);
 assert.equal(result.status,'ready');
 assert.deepEqual(result.steps.map(s=>s.expectedRevision),[4,5]);
});
test('rejects remote revision changes',()=>{
 assert.equal(planV2SequentialRebase([op('a',0)],{...remote,revision:5}).status,'conflict');
});
test('repeated edits to one set require manual review',()=>{
 assert.equal(planV2SequentialRebase([op('a',0),op('b',0)],remote).status,'manual-review');
});
test('rejects remote set changes',()=>{
 const changed={...remote,sets:[{done:true,completedAt:'2026-10-16T12:00:00.000Z'},remote.sets[1]]};
 assert.equal(planV2SequentialRebase([op('a',0)],changed).status,'conflict');
});
