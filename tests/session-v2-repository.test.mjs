import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {createV2Workout,readV2Workout} from '../session-v2-repository.js';
test('V2 creation stages metadata, 12 exercises and active pointer',async()=>{
 const writes=[];
 const db={};
 const doc=(_db,...parts)=>parts.join('/');
 const runTransaction=async(_db,fn)=>fn({
  get:async()=>({exists:()=>false}),
  set:(ref,value)=>writes.push({ref,value})
 });
 const session=startSession({id:'v2-transaction',day:0,now:0});
 const id=await createV2Workout({db,uid:'owner',session,runTransaction,doc,serverTimestamp:()=>123});
 assert.equal(id,session.id);
 assert.equal(writes.length,14);
 assert.equal(writes.filter(x=>x.ref.includes('/exercises/')).length,12);
 assert.equal(writes.at(-1).value.sessionId,session.id);
});
test('V2 refuses incomplete reads',()=>{
 const session=startSession({id:'v2-read',day:0,now:0});
 const metadata={...session,schemaVersion:2};
 assert.throws(()=>readV2Workout(metadata,[]),/incompletos/);
});

test('V2 per-set weight is optional and saved atomically without changing the other set',async()=>{
 const {updateV2Set}=await import('../session-v2-repository.js');
 const writes=[];
 const doc=(_db,...parts)=>parts.join('/');
 const tx={get:async ref=>({exists:()=>true,data:()=>ref.endsWith('/exercises/0')?{index:0,sessionId:'s1',revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]}:{schemaVersion:2,status:'active'}}),update:(ref,data)=>writes.push({ref,data})};
 const result=await updateV2Set({db:{},uid:'owner',sessionId:'s1',exerciseIndex:0,setIndex:0,done:true,weightKg:32.5,expectedCompletedAt:null,expectedRevision:0,runTransaction:async(_db,fn)=>fn(tx),doc,serverTimestamp:()=>123,now:1000});
 assert.equal(result.weightKg,32.5);
 assert.equal(writes[0].data.sets[0].weightKg,32.5);
 assert.equal(writes[0].data.sets[1].weightKg,undefined);
 assert.equal(writes[0].data.revision,1);
});
test('V2 rejects invalid per-set weights before transaction',async()=>{
 const {updateV2Set}=await import('../session-v2-repository.js');
 for(const weightKg of [-1,2001,Infinity,NaN,'32']){
  await assert.rejects(updateV2Set({db:{},uid:'owner',sessionId:'s1',exerciseIndex:0,setIndex:0,done:true,weightKg,expectedCompletedAt:null,expectedRevision:0,runTransaction:()=>{throw Error('transaction unexpectedly called')},doc:()=>({}),serverTimestamp:()=>0}),/Carga inválida/);
 }
});
