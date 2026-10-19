import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-child-exercises',
  firestore:{rules:readFileSync(new URL('./fixtures/dynamic-workout-child-exercises.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup()});
const db=uid=>env.authenticatedContext(uid).firestore();
const base='users/alice/workoutPlans/plan-child/exercises/';
const exercise={id:'exercise-1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0,revision:1,updatedAt:serverTimestamp()};
test('owner creates, reads and revises one exercise document',async()=>{
 const ref=doc(db('alice'),base+'exercise-1');
 await assertSucceeds(setDoc(ref,exercise));
 assert.equal((await assertSucceeds(getDoc(ref))).data().sets,3);
 await assertSucceeds(updateDoc(ref,{sets:4,revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{sets:5,revision:2,updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(ref));
});
test('other users and guests cannot access exercise documents',async()=>{
 await assertFails(getDoc(doc(db('bob'),base+'exercise-1')));
 await assertFails(setDoc(doc(db('bob'),base+'exercise-2'),{...exercise,id:'exercise-2'}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),base+'exercise-1')));
});
test('rejects invalid IDs, extra fields and invalid set counts',async()=>{
 await assertFails(setDoc(doc(db('alice'),base+'wrong-id'),exercise));
 await assertFails(setDoc(doc(db('alice'),base+'bad-sets'),{...exercise,id:'bad-sets',sets:13}));
 await assertFails(setDoc(doc(db('alice'),base+'extra'),{...exercise,id:'extra',unexpected:true}));
});
