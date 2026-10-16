import test from 'node:test';
import assert from 'node:assert/strict';
import {loadV2Summary} from '../session-v2-summary-reader.js';
const doc=(db,...parts)=>parts.join('/');
test('read-only summary reader returns verified counts',async()=>{
 const result=await loadV2Summary({db:{},uid:'u',sessionId:'s',doc,getDoc:async()=>({exists:()=>true,data:()=>({sessionId:'s',completedSets:17,totalSets:24})})});
 assert.deepEqual(result,{completedSets:17,totalSets:24});
});
test('missing summary is not treated as zero',async()=>{
 assert.equal(await loadV2Summary({db:{},uid:'u',sessionId:'s',doc,getDoc:async()=>({exists:()=>false})}),null);
});
test('invalid or mismatched summary fails closed',async()=>{
 for(const value of [{sessionId:'other',completedSets:2,totalSets:24},{sessionId:'s',completedSets:25,totalSets:24},{sessionId:'s',completedSets:2,totalSets:12}]){
  await assert.rejects(loadV2Summary({db:{},uid:'u',sessionId:'s',doc,getDoc:async()=>({exists:()=>true,data:()=>value})}),/Resumo V2 inválido/);
 }
});
