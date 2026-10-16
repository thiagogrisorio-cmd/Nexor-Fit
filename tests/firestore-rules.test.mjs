import {encodeSessionForFirestore,decodeSessionFromFirestore} from '../firestore-session-codec.js';
import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';

let env;
const projectId='demo-nexor-fit-rules-test';
before(async()=>{
 env=await initializeTestEnvironment({
  projectId,
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup();});
const db=uid=>env.authenticatedContext(uid).firestore();
const guest=()=>env.unauthenticatedContext().firestore();
const sets=()=>Array.from({length:12},()=>Array.from({length:2},()=>({done:false,completedAt:null})));
const session=id=>encodeSessionForFirestore({id,day:0,status:'active',startedAt:'2026-10-15T12:00:00.000Z',endedAt:null,restSeconds:90,restUntil:null,sets:sets(),updatedAt:serverTimestamp()});

test('owner can create and read session; another account cannot read or write',async()=>{
 const path='users/alice/sessions/allowed-1';
 await assertSucceeds(setDoc(doc(db('alice'),path),session('allowed-1')));
 await assertSucceeds(getDoc(doc(db('alice'),path)));
 await assertFails(getDoc(doc(db('bob'),path)));
 await assertFails(setDoc(doc(db('bob'),path),session('allowed-1')));
});
test('reject malformed session payload and ID mismatch',async()=>{
 await assertFails(setDoc(doc(db('alice'),'users/alice/sessions/mismatch'),session('different')));
 const invalid=session('bad-sets');
 invalid.sets=[{items:[{done:true,completedAt:null}]}];
 await assertFails(setDoc(doc(db('alice'),'users/alice/sessions/bad-sets'),invalid));
});
test('owner can complete session but cannot reopen it',async()=>{
 const path='users/alice/sessions/completion-1';
 await assertSucceeds(setDoc(doc(db('alice'),path),session('completion-1')));
 const completed={...session('completion-1'),status:'completed',endedAt:'2026-10-15T12:10:00.000Z',durationSeconds:600};
 await assertSucceeds(setDoc(doc(db('alice'),path),completed));
 await assertFails(setDoc(doc(db('alice'),path),session('completion-1')));
});
test('session control is owner-only and rejects unexpected fields',async()=>{
 const path='users/alice/sessionControl/active';
 await assertSucceeds(setDoc(doc(db('alice'),path),{sessionId:'allowed-1',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db('bob'),path)));
 await assertFails(setDoc(doc(db('alice'),path),{sessionId:'allowed-1',updatedAt:serverTimestamp(),extra:true}));
});

test('unauthenticated visitor cannot read or write private sessions',async()=>{
 const path='users/alice/sessions/allowed-1';
 await assertFails(getDoc(doc(guest(),path)));
 await assertFails(setDoc(doc(guest(),path),session('allowed-1')));
});
test('cannot change day or start timestamp after session creation',async()=>{
 const path='users/alice/sessions/immutable-1';
 await assertSucceeds(setDoc(doc(db('alice'),path),session('immutable-1')));
 await assertFails(setDoc(doc(db('alice'),path),{...session('immutable-1'),day:2}));
 await assertFails(setDoc(doc(db('alice'),path),{...session('immutable-1'),startedAt:'2026-10-15T12:01:00.000Z'}));
});
test('rejects extra fields and malformed start timestamps',async()=>{
 await assertFails(setDoc(doc(db('alice'),'users/alice/sessions/extra-1'),{...session('extra-1'),admin:true}));
 await assertFails(setDoc(doc(db('alice'),'users/alice/sessions/time-1'),{...session('time-1'),startedAt:'yesterday'}));
});

test('simultaneous starts share one active-session pointer',async()=>{
 const path='users/concurrent/sessionControl/active';
 const {runTransaction}=await import('firebase/firestore');
 const attempt=async id=>{
  const firestore=db('concurrent');
  const control=doc(firestore,path);
  const target=doc(firestore,'users/concurrent/sessions/'+id);
  return runTransaction(firestore,async tx=>{
   const snapshot=await tx.get(control);
   if(snapshot.exists()&&snapshot.data().sessionId)throw Error('Treino já ativo');
   tx.set(target,session(id));
   tx.set(control,{sessionId:id,updatedAt:serverTimestamp()});
  });
 };
 const results=await Promise.allSettled([attempt('race-one'),attempt('race-two')]);
 const success=results.filter(item=>item.status==='fulfilled');
 const failure=results.filter(item=>item.status==='rejected');
 assert.equal(success.length,1,'exactly one device must start a session');
 assert.equal(failure.length,1,'other device must be rejected');
 const pointer=await assertSucceeds(getDoc(doc(db('concurrent'),path)));
 assert.ok(['race-one','race-two'].includes(pointer.data().sessionId));
});
