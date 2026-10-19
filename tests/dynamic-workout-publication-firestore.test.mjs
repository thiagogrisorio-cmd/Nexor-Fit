import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {publishWorkoutRevisionTransaction} from '../workout-plan-publish-repository.js';

let env;
before(async()=>{env=await initializeTestEnvironment({
 projectId:'demo-nexor-fit-publication-transaction',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
})});
after(async()=>{if(env)await env.cleanup()});
const uid='publication-integration';
const planPath='users/'+uid+'/workoutPlans/p1';
const revisionPath=planPath+'/revisions/2';
const childPath=revisionPath+'/exercises/e1';
const deps={doc,runTransaction,serverTimestamp};
const manifest={planId:'p1',revision:2,status:'draft',name:'Treino personalizado',origin:'manual',exerciseIds:['e1']};
const exercise={id:'e1',revision:2,name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0};
const publish=db=>publishWorkoutRevisionTransaction({db,uid,planId:'p1',revision:2,expectedPublishedRevision:1,...deps});

test('real emulator transaction publishes complete revision and rejects repeated publish',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,planPath),{id:'p1',publishedRevision:1,archived:false});
  await setDoc(doc(db,revisionPath),manifest);
  await setDoc(doc(db,childPath),exercise);
  const result=await publish(db);
  assert.equal(result.action,'publish');
  assert.equal((await getDoc(doc(db,planPath))).data().publishedRevision,2);
  assert.equal((await getDoc(doc(db,revisionPath))).data().status,'published');
  await assert.rejects(()=>publish(db),/Publication conflict/);
  assert.equal((await getDoc(doc(db,planPath))).data().publishedRevision,2);
 });
 await assertFails(getDoc(doc(env.authenticatedContext(uid).firestore(),planPath)));
});
test('real emulator transaction rejects missing child without publishing pointer',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  const plan=doc(db,'users',uid,'workoutPlans','missing-plan');
  const revision=doc(db,'users',uid,'workoutPlans','missing-plan','revisions','2');
  await setDoc(plan,{id:'missing-plan',publishedRevision:1,archived:false});
  await setDoc(revision,{...manifest,planId:'missing-plan'});
  await assert.rejects(()=>publishWorkoutRevisionTransaction({
   db,uid,planId:'missing-plan',revision:2,expectedPublishedRevision:1,...deps
  }),/missing exercise/);
  assert.equal((await getDoc(plan)).data().publishedRevision,1);
  assert.equal((await getDoc(revision)).data().status,'draft');
 });
});
test('real emulator transaction rejects stale pointer without changing revision',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  const plan=doc(db,'users',uid,'workoutPlans','stale-plan');
  const revision=doc(db,'users',uid,'workoutPlans','stale-plan','revisions','2');
  await setDoc(plan,{id:'stale-plan',publishedRevision:2,archived:false});
  await setDoc(revision,{...manifest,planId:'stale-plan'});
  await setDoc(doc(db,'users',uid,'workoutPlans','stale-plan','revisions','2','exercises','e1'),exercise);
  await assert.rejects(()=>publishWorkoutRevisionTransaction({
   db,uid,planId:'stale-plan',revision:2,expectedPublishedRevision:1,...deps
  }),/Publication conflict/);
  assert.equal((await getDoc(plan)).data().publishedRevision,2);
  assert.equal((await getDoc(revision)).data().status,'draft');
 });
});

test('two concurrent publications cannot both advance the same revision',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore(),planId='concurrent-plan';
  const planRef=doc(db,'users',uid,'workoutPlans',planId);
  const revisionRef=doc(db,'users',uid,'workoutPlans',planId,'revisions','2');
  await setDoc(planRef,{id:planId,publishedRevision:1,archived:false});
  await setDoc(revisionRef,{...manifest,planId});
  await setDoc(doc(db,'users',uid,'workoutPlans',planId,'revisions','2','exercises','e1'),exercise);
  const publishOnce=()=>publishWorkoutRevisionTransaction({
   db,uid,planId,revision:2,expectedPublishedRevision:1,...deps
  });
  const results=await Promise.allSettled([publishOnce(),publishOnce()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.match(String(results.find(r=>r.status==='rejected').reason),/Publication conflict/);
  assert.equal((await getDoc(planRef)).data().publishedRevision,2);
  assert.equal((await getDoc(revisionRef)).data().status,'published');
 });
});
test('published revision children remain unchanged after a rejected replay',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  const original=(await getDoc(doc(db,childPath))).data();
  await assert.rejects(()=>publish(db),/Publication conflict/);
  const current=(await getDoc(doc(db,childPath))).data();
  assert.deepEqual(current,original);
 });
});
