import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,runTransaction,serverTimestamp,updateDoc,getDoc} from 'firebase/firestore';
import {startSession} from '../workout-session.js';
import {createV2Workout} from '../session-v2-repository.js';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-v2-update-guards',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
test('V2 child update is denied when parent workout is completed',async()=>{
 const uid='v2-completed-guard',sessionId='v2-completed-guard-session';
 const db=env.authenticatedContext(uid).firestore();
 await assertSucceeds(createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp}));
 const root=doc(db,'users',uid,'sessions',sessionId);
 await env.withSecurityRulesDisabled(async context=>{
  await updateDoc(doc(context.firestore(),root.path),{status:'completed',updatedAt:new Date()});
 });
 const exercise=doc(db,'users',uid,'sessions',sessionId,'exercises','0');
 const existing=(await assertSucceeds(getDoc(exercise))).data();
 await assertFails(updateDoc(exercise,{revision:1,sets:[{done:true,completedAt:'2026-10-16T00:00:00.000Z'},existing.sets[1]],updatedAt:serverTimestamp()}));
});
