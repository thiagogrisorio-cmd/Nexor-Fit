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
