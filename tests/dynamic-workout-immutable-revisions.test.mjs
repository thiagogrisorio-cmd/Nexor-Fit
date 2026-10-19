import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({
 projectId:'demo-nexor-fit-immutable-revisions',
 firestore:{rules:readFileSync(new URL('./fixtures/dynamic-workout-immutable-revisions.rules',import.meta.url),'utf8')}
})});
after(async()=>{if(env)await env.cleanup()});
const base='users/alice/workoutPlans/p1/revisions/2';
const exercisePath=base+'/exercises/e1';
const db=uid=>env.authenticatedContext(uid).firestore();
const exercise={id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0,revision:2,updatedAt:serverTimestamp()};
test('owner can create draft revision and exercise but cannot mutate either',async()=>{
 const database=db('alice'),revision=doc(database,base),child=doc(database,exercisePath);
 await assertSucceeds(setDoc(revision,{planId:'p1',revision:2,status:'draft',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(child,exercise));
 assert.equal((await assertSucceeds(getDoc(child))).data().sets,3);
 await assertFails(updateDoc(child,{sets:4,updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(child));
 await assertFails(updateDoc(revision,{status:'published',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(revision));
});
test('foreign users and guests cannot access versioned children',async()=>{
 await assertFails(getDoc(doc(db('bob'),exercisePath)));
 await assertFails(setDoc(doc(db('bob'),base+'/exercises/e2'),{...exercise,id:'e2'}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),exercisePath)));
});
test('missing draft, mismatched revision and invalid fields are denied',async()=>{
 await assertFails(setDoc(doc(db('alice'),'users/alice/workoutPlans/p1/revisions/3/exercises/e2'),{...exercise,id:'e2',revision:3}));
 await assertFails(setDoc(doc(db('alice'),base+'/exercises/e2'),{...exercise,id:'e2',revision:3}));
 await assertFails(setDoc(doc(db('alice'),base+'/exercises/e3'),{...exercise,id:'e3',sets:20}));
});
test('a server-published revision rejects any new child writes',async()=>{
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),base),{planId:'p1',revision:2,status:'published',updatedAt:serverTimestamp()});
 });
 await assertFails(setDoc(doc(db('alice'),base+'/exercises/e4'),{...exercise,id:'e4'}));
 await assertFails(updateDoc(doc(db('alice'),exercisePath),{sets:5,updatedAt:serverTimestamp()}));
});
