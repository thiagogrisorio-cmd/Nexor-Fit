import {encodeSessionForFirestore,decodeSessionFromFirestore} from '../firestore-session-codec.js';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,runTransaction,serverTimestamp,setDoc} from 'firebase/firestore';
import {startSession,markSet,finishSession} from '../workout-session.js';
import {makeOfflineOperation} from '../offline-operations.js';
import {planOfflineSync} from '../offline-sync-plan.js';

let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-offline-sync',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup();});
const db=uid=>env.authenticatedContext(uid).firestore();
const base=id=>startSession({id,day:0,now:Date.parse('2026-10-15T12:00:00Z')});
const op=(id,sessionId,kind,at,exercise=null,set=null,done=null)=>
 makeOfflineOperation({id,sessionId,kind,at,exercise,set,done});
async function seed(firestore,id){
 const sessionRef=doc(firestore,'users','alice','sessions',id);
 const controlRef=doc(firestore,'users','alice','sessionControl','active');
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'users','alice','sessions',id),{...encodeSessionForFirestore(base(id)),updatedAt:serverTimestamp()}));
 await setDoc(controlRef,{sessionId:id,updatedAt:serverTimestamp()});
 return {sessionRef,controlRef};
}
async function sync(firestore,sessionRef,controlRef,operations){
 return runTransaction(firestore,async tx=>{
  const control=await tx.get(controlRef);
  const snap=await tx.get(sessionRef);
  const plan=planOfflineSync(decodeSessionFromFirestore(snap.data()),operations);
  if(plan.status==='ready'){
   if(control.data()?.sessionId!==snap.id)return {status:'conflict',reason:'pointer-changed'};
   tx.set(sessionRef,{...encodeSessionForFirestore(plan.session),updatedAt:serverTimestamp()});
   tx.set(controlRef,{sessionId:plan.session.status==='active'?snap.id:'',updatedAt:serverTimestamp()});
  }
  return plan;
 });
}
test('retired V1 offline edits and finish cannot write to Firestore',async()=>{
 const firestore=db('alice'),{sessionRef,controlRef}=await seed(firestore,'sync-finish');
 const t=Date.parse('2026-10-15T12:02:00Z');
 const operations=[op('one','sync-finish','mark-set',t,0,0,true),op('two','sync-finish','finish',t+60000)];
 await assertFails(sync(firestore,sessionRef,controlRef,operations));
 const stored=decodeSessionFromFirestore((await getDoc(sessionRef)).data());
 assert.equal(stored.status,'active');
 assert.equal(stored.sets[0][0].done,false);
 assert.equal((await getDoc(controlRef)).data().sessionId,'sync-finish');
});
test('retired V1 cannot be remotely completed or overwritten',async()=>{
 const firestore=db('alice'),{sessionRef,controlRef}=await seed(firestore,'sync-conflict');
 const t=Date.parse('2026-10-15T12:04:00Z');
 await assertFails(setDoc(sessionRef,{...encodeSessionForFirestore(finishSession(base('sync-conflict'),t)),updatedAt:serverTimestamp()}));
 await assertFails(sync(firestore,sessionRef,controlRef,[op('three','sync-conflict','mark-set',t-1000,0,0,true)]));
 assert.equal(decodeSessionFromFirestore((await getDoc(sessionRef)).data()).status,'active');
});
test('other account cannot read or synchronize historical V1 session',async()=>{
 const firestore=db('alice'),{sessionRef}=await seed(firestore,'sync-private');
 await assert.rejects(getDoc(doc(db('bob'),sessionRef.path)));
});
test('retired V1 rejects partial queue replay without changing original session',async()=>{
 const firestore=db('alice'),{sessionRef,controlRef}=await seed(firestore,'sync-partial');
 const t=Date.parse('2026-10-15T12:05:00Z');
 const operations=[op('first','sync-partial','mark-set',t,0,0,true),op('last','sync-partial','finish',t+2000)];
 await assertFails(sync(firestore,sessionRef,controlRef,operations));
 await assertFails(sync(firestore,sessionRef,controlRef,operations.slice(1)));
 assert.equal((await getDoc(sessionRef)).data().status,'active');
});
test('retired V1 rejects concurrent set overwrites',async()=>{
 const firestore=db('alice'),{sessionRef,controlRef}=await seed(firestore,'sync-same-set');
 const t=Date.parse('2026-10-15T12:06:00Z');
 await assertFails(setDoc(sessionRef,{...encodeSessionForFirestore(markSet(base('sync-same-set'),0,0,true,t)),updatedAt:serverTimestamp()}));
 await assertFails(sync(firestore,sessionRef,controlRef,[op('local','sync-same-set','mark-set',t+1000,0,0,true)]));
 assert.equal(decodeSessionFromFirestore((await getDoc(sessionRef)).data()).sets[0][0].done,false);
});
