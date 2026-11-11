import test,{before,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';
let env;before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-rules-test',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}})});after(async()=>env?.cleanup());
const plan=(revision=1)=>({revision,focus:'Costas',exercises:Array.from({length:12},(_,i)=>'Costas|Remada '+i+'|8–12'),updatedAt:serverTimestamp()});
test('private training plans reject another account, guests, stale revisions and unknown fields',async()=>{
 const owner=env.authenticatedContext('plan-owner').firestore(),other=env.authenticatedContext('plan-other').firestore(),guest=env.unauthenticatedContext().firestore();
 const path='users/plan-owner/trainingPlans/0';
 await assertSucceeds(setDoc(doc(owner,path),plan()));await assertSucceeds(getDoc(doc(owner,path)));
 await assertFails(getDoc(doc(other,path)));await assertFails(getDoc(doc(guest,path)));await assertFails(setDoc(doc(other,path),plan(2)));
 await assertFails(setDoc(doc(owner,path),plan()));await assertSucceeds(setDoc(doc(owner,path),plan(2)));
 await assertFails(setDoc(doc(owner,path),{...plan(3),isAdmin:true}));
});
test('every prescription slot is validated on create and update',async()=>{
 const db=env.authenticatedContext('slot-owner').firestore();
 for(let i=0;i<12;i++){
  const path=doc(db,'users/slot-owner/trainingPlans/'+(i%4)),invalid=plan();invalid.exercises[i]='Sem separadores';
  await assertFails(setDoc(path,invalid));
 }
 const ref=doc(db,'users/slot-owner/trainingPlans/0');await assertSucceeds(setDoc(ref,plan()));
 const invalid=plan(2);invalid.exercises[11]='Grupo|'+'x'.repeat(121)+'|10';await assertFails(setDoc(ref,invalid));
});
test('session prescription is optional for old records and immutable after creation',async()=>{
 const db=env.authenticatedContext('snapshot-owner').firestore(),ref=doc(db,'users/snapshot-owner/sessions/snapshot-test');
 const value={id:'snapshot-test',schemaVersion:2,day:0,status:'active',startedAt:'2026-11-11T12:00:00.000Z',restSeconds:90,updatedAt:serverTimestamp(),prescription:plan().exercises};
 await assertSucceeds(setDoc(ref,value));
 const changed=[...value.prescription];changed[0]='Pernas|Agachamento|10';
 await assertFails(updateDoc(ref,{prescription:changed,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref,{status:'completed',endedAt:'2026-11-11T13:00:00.000Z',durationSeconds:3600,updatedAt:serverTimestamp()}));
});
