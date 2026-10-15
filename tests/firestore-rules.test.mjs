import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';

let env;
const projectId='nexor-fit-rules-test';
before(async()=>{
 env=await initializeTestEnvironment({
  projectId,
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup();});
const db=uid=>env.authenticatedContext(uid).firestore();
const sets=()=>Array.from({length:12},()=>Array.from({length:2},()=>({done:false,completedAt:null})));
const session=id=>({id,day:0,status:'active',startedAt:'2026-10-15T12:00:00.000Z',endedAt:null,restSeconds:90,restUntil:null,sets:sets(),updatedAt:serverTimestamp()});

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
 invalid.sets=[[{done:true,completedAt:null}]];
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
