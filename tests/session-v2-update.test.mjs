import test from 'node:test';
import assert from 'node:assert/strict';
import {updateV2Set} from '../session-v2-repository.js';
const db={};
const doc=(_db,...parts)=>parts.join('/');
function harness({status='active',completedAt=null}={}){
 const writes=[];
 const runTransaction=async(_db,fn)=>fn({
  get:async ref=>({exists:()=>true,data:()=>ref.endsWith('/exercises/0')?
   {index:0,sessionId:'session',sets:[{done:completedAt!==null,completedAt},{done:false,completedAt:null}]}:
   {id:'session',schemaVersion:2,status}}),
  update:(ref,value)=>writes.push({ref,value})
 });
 return {writes,runTransaction};
}
const params=h=>({db,uid:'owner',sessionId:'session',exerciseIndex:0,setIndex:0,done:true,expectedCompletedAt:null,runTransaction:h.runTransaction,doc,serverTimestamp:()=>123,now:0});
test('V2 updates exactly one exercise document',async()=>{
 const h=harness();
 const result=await updateV2Set(params(h));
 assert.equal(result.done,true);
 assert.equal(h.writes.length,1);
 assert.equal(h.writes[0].value.sets[0].completedAt,'1970-01-01T00:00:00.000Z');
});
test('V2 rejects concurrent modification',async()=>{
 const h=harness({completedAt:'2026-10-16T12:00:00.000Z'});
 await assert.rejects(updateV2Set(params(h)),/Conflito/);
 assert.equal(h.writes.length,0);
});
test('V2 rejects updates to completed sessions',async()=>{
 const h=harness({status:'completed'});
 await assert.rejects(updateV2Set(params(h)),/não está ativa/);
 assert.equal(h.writes.length,0);
});
