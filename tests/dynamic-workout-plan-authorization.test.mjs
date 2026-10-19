import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-dynamic-plans',
  firestore:{rules:readFileSync(new URL('./fixtures/dynamic-workout-plans.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup()});
const db=uid=>env.authenticatedContext(uid).firestore();
const path='users/alice/workoutPlans/p1';
const ex={id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0};
const plan={id:'p1',name:'Meu plano',origin:'manual',revision:1,archived:false,exercises:[ex],updatedAt:serverTimestamp()};
test('fixture permits owner create, read, revise and archive, never delete',async()=>{
 const ref=doc(db('alice'),path);
 await assertSucceeds(setDoc(ref,plan));
 await assertSucceeds(getDoc(ref));
 await assertSucceeds(updateDoc(ref,{name:'Novo nome',revision:2,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{revision:2,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref,{archived:true,revision:3,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{name:'Proibido',revision:4,updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(ref));
});
test('fixture blocks foreign users and unauthenticated clients',async()=>{
 await assertFails(getDoc(doc(db('bob'),path)));
 await assertFails(setDoc(doc(db('bob'),'users/alice/workoutPlans/foreign'),{...plan,id:'foreign'}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
});
test('fixture rejects malformed exercises and arbitrary extra fields',async()=>{
 const base='users/alice/workoutPlans/';
 await assertFails(setDoc(doc(db('alice'),base+'bad-extra'),{...plan,id:'bad-extra',unexpected:true}));
 await assertFails(setDoc(doc(db('alice'),base+'bad-sets'),{...plan,id:'bad-sets',exercises:[{...ex,sets:13}]}));
 await assertFails(setDoc(doc(db('alice'),base+'bad-order'),{...plan,id:'bad-order',exercises:[{...ex,order:1}]}));
 await assertFails(setDoc(doc(db('alice'),base+'bad-dup'),{...plan,id:'bad-dup',exercises:[ex,{...ex,order:1}]}));
});
test('experimental plan fixture does not authorize dynamic sessions',async()=>{
 await assertFails(getDoc(doc(db('alice'),'users/alice/dynamicSessions/s1')));
 await assertFails(setDoc(doc(db('alice'),'users/alice/dynamicSessionControl/active'),{sessionId:'s1',updatedAt:serverTimestamp()}));
});
