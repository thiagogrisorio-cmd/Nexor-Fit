import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {encodeDynamicSession,decodeDynamicSession} from '../workout-plan-firestore-codec.js';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';

/**
 * Explicit deny-by-default tests for new dynamic workout paths.
 * These tests deliberately DO NOT authorize writes or change production rules.
 */
let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-rules-test',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup()});
const user=uid=>env.authenticatedContext(uid).firestore();
const guest=()=>env.unauthenticatedContext().firestore();
const plan={id:'plan-1',name:'Meu treino',origin:'manual',revision:1,archived:false,exercises:[{id:'e1',name:'Agachamento',muscleGroup:'Pernas',sets:3,reps:'8-12',restSeconds:90,order:0}],updatedAt:serverTimestamp()};
const session={id:'session-1',requestId:'request-1',planId:'plan-1',planRevision:1,status:'active',startedAt:'2026-10-19T12:00:00.000Z',endedAt:null,prescription:{id:'plan-1',name:'Meu treino',origin:'manual',revision:1,exercises:[]},sets:[{items:[{done:false,completedAt:null}]}],updatedAt:serverTimestamp()};
test('dynamic workout plans remain denied for owner, other user and guest until rules are reviewed',async()=>{
 const path='users/alice/workoutPlans/plan-1';
 for(const firestore of [user('alice'),user('bob'),guest()]){
  await assertFails(getDoc(doc(firestore,path)));
  await assertFails(setDoc(doc(firestore,path),plan));
  await assertFails(deleteDoc(doc(firestore,path)));
 }
});
test('dynamic sessions and active pointers remain denied by default',async()=>{
 const paths=[
  ['users/alice/dynamicSessions/session-1',session],
  ['users/alice/dynamicSessionControl/active',{sessionId:'session-1',updatedAt:serverTimestamp()}]
 ];
 for(const [path,payload] of paths){
  for(const firestore of [user('alice'),user('bob'),guest()]){
   await assertFails(getDoc(doc(firestore,path)));
   await assertFails(setDoc(doc(firestore,path),payload));
   await assertFails(deleteDoc(doc(firestore,path)));
  }
 }
});

test('Firestore emulator round-trips variable sets through privileged test context only',async()=>{
 const workout={id:'emulator-plan',name:'Personalizado',origin:'manual',exercises:[
  {id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'},
  {id:'e2',name:'Agachamento',muscleGroup:'Pernas',sets:4,reps:'8'}
 ]};
 const candidate=prepareWorkoutFromPlan({plan:workout,sessionId:'emulator-session',requestId:'emulator-request',now:1000});
 candidate.sets[0][0].weightKg=32.5;
 const encoded=encodeDynamicSession(candidate);
 await env.withSecurityRulesDisabled(async context=>{
  const firestore=context.firestore();
  const ref=doc(firestore,'users/emulator/dynamicSessions/emulator-session');
  await assertSucceeds(setDoc(ref,encoded));
  const snapshot=await assertSucceeds(getDoc(ref));
  assert.equal(snapshot.exists(),true);
  const restored=decodeDynamicSession(snapshot.data());
  assert.deepEqual(restored,candidate);
  assert.deepEqual(restored.sets.map(row=>row.length),[3,4]);
  assert.equal(restored.sets[0][0].weightKg,32.5);
 });
 // A successful privileged emulator write must not grant normal client access.
 await assertFails(getDoc(doc(user('emulator'),'users/emulator/dynamicSessions/emulator-session')));
});
