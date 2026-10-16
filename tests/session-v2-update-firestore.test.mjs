import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,runTransaction,getDoc,serverTimestamp} from 'firebase/firestore';
import {startSession} from '../workout-session.js';
import {createV2Workout,updateV2Set} from '../session-v2-repository.js';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-rules-test',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
test('V2 Firestore transaction updates one set and increments revision',async()=>{
 const db=env.authenticatedContext('revision-user').firestore();
 const session=startSession({id:'revision-test',day:0,now:0});
 await assertSucceeds(createV2Workout({db,uid:'revision-user',session,runTransaction,doc,serverTimestamp}));
 const args={db,uid:'revision-user',sessionId:session.id,exerciseIndex:0,setIndex:0,done:true,expectedCompletedAt:null,expectedRevision:0,runTransaction,doc,serverTimestamp,now:0};
 await assertSucceeds(updateV2Set(args));
 const ref=doc(db,'users','revision-user','sessions',session.id,'exercises','0');
 const current=await assertSucceeds(getDoc(ref));
 assert.equal(current.data().revision,1);
 assert.equal(current.data().sets[0].done,true);
 await assert.rejects(updateV2Set(args),/Conflito/);
});

test('two devices using same revision cannot both overwrite one V2 set',async()=>{
 const uid='concurrent-revision-user',sessionId='concurrent-revision-session';
 const first=env.authenticatedContext(uid).firestore();
 const second=env.authenticatedContext(uid).firestore();
 await assertSucceeds(createV2Workout({db:first,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp}));
 const base={uid,sessionId,exerciseIndex:2,setIndex:1,expectedCompletedAt:null,expectedRevision:0,runTransaction,doc,serverTimestamp,now:1000};
 const outcomes=await Promise.allSettled([
  updateV2Set({...base,db:first,done:true}),
  updateV2Set({...base,db:second,done:true})
 ]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);
 const record=await assertSucceeds(getDoc(doc(first,'users',uid,'sessions',sessionId,'exercises','2')));
 assert.equal(record.data().revision,1);
 assert.equal(record.data().sets[1].done,true);
});
