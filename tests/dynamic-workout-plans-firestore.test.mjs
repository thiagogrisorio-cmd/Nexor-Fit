import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {createWorkoutPlan,updateWorkoutPlan,archiveWorkoutPlanRecord} from '../workout-plan-store.js';
import {reviseWorkoutPlan} from '../workout-plan-model.js';

let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-rules-test',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup()});
const deps={doc,runTransaction,serverTimestamp};
const plan={id:'plan-integration',name:'Personalizado',origin:'manual',exercises:[
 {id:'a',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'},
 {id:'b',name:'Agachamento',muscleGroup:'Pernas',sets:4,reps:'8'}
]};
test('real Firestore plan transactions create, revise, reject stale writes and archive',async()=>{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore(),uid='plan-transaction-test';
  const created=await createWorkoutPlan({db,uid,plan,...deps});
  assert.equal(created.revision,1);
  const ref=doc(db,'users',uid,'workoutPlans',plan.id);
  const first=(await getDoc(ref)).data();
  assert.deepEqual(first.exercises.map(x=>x.sets),[3,4]);
  await assert.rejects(()=>createWorkoutPlan({db,uid,plan,...deps}),/Plano já existe/);
  const revised=reviseWorkoutPlan(plan,{name:'Personalizado atualizado'});
  const updated=await updateWorkoutPlan({db,uid,plan:revised,expectedRevision:1,...deps});
  assert.equal(updated.revision,2);
  await assert.rejects(()=>updateWorkoutPlan({db,uid,plan:revised,expectedRevision:1,...deps}),/Conflito de revisão/);
  const archived=await archiveWorkoutPlanRecord({db,uid,id:plan.id,expectedRevision:2,...deps});
  assert.equal(archived.revision,3);
  assert.equal((await getDoc(ref)).data().archived,true);
  await assert.rejects(()=>updateWorkoutPlan({db,uid,plan:reviseWorkoutPlan(revised,{name:'Novo'}),expectedRevision:2,...deps}),/Plano arquivado/);
  await assert.rejects(()=>archiveWorkoutPlanRecord({db,uid,id:plan.id,expectedRevision:2,...deps}),/Conflito de revisão/);
 });
 const ref=doc(env.authenticatedContext('plan-transaction-test').firestore(),'users/plan-transaction-test/workoutPlans/plan-integration');
 await assertFails(getDoc(ref));
});
