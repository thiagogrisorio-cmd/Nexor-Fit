import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-rules-test',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
const db=uid=>env.authenticatedContext(uid).firestore();
const parent='users/alice/sessions/v2-session';
const path=index=>parent+'/exercises/'+index;
const payload=index=>({index,sessionId:'v2-session',sets:[{done:false,completedAt:null},{done:true,completedAt:'2026-10-16T12:00:00.000Z'}],updatedAt:serverTimestamp()});
test('v2: owner writes both sets and other account cannot read',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  await setDoc(doc(context.firestore(),parent),{id:'v2-session'});
 });
 await assertSucceeds(setDoc(doc(db('alice'),path(0)),payload(0)));
 await assertSucceeds(getDoc(doc(db('alice'),path(0))));
 await assertFails(getDoc(doc(db('bob'),path(0))));
 await assertFails(setDoc(doc(db('bob'),path(1)),payload(1)));
});
test('v2: rejects malformed set, foreign session, extra fields and index mismatch',async()=>{
 await assertFails(setDoc(doc(db('alice'),path(1)),{...payload(1),sets:[{done:'yes',completedAt:null},{done:false,completedAt:null}]}));
 await assertFails(setDoc(doc(db('alice'),path(1)),{...payload(1),sessionId:'other'}));
 await assertFails(setDoc(doc(db('alice'),path(1)),{...payload(1),extra:true}));
 await assertFails(setDoc(doc(db('alice'),path(1)),payload(2)));
 await assertFails(setDoc(doc(db('alice'),path(12)),payload(12)));
});
test('v2: denies exercise write without existing parent session',async()=>{
 await assertFails(setDoc(doc(db('alice'),'users/alice/sessions/missing/exercises/0'),{...payload(0),sessionId:'missing'}));
});
