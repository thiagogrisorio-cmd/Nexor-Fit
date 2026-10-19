import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {createDynamicWorkoutSession,finishDynamicWorkoutSession} from '../workout-plan-repository.js';

let env;
before(async()=>{
 env=await initializeTestEnvironment({
  projectId:'demo-nexor-fit-rules-test',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
 });
});
after(async()=>{if(env)await env.cleanup()});
const plan={id:'dynamic-plan',name:'Treino livre',origin:'manual',exercises:[
 {id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'},
 {id:'e2',name:'Agachamento',muscleGroup:'Pernas',sets:4,reps:'8'}
]};
const dependencies={doc,runTransaction,serverTimestamp};
test('privileged emulator verifies atomic dynamic start, conflicting start and finish',async()=>{
 // This context intentionally bypasses rules to test transaction semantics only.
 // It does not prove client authorization or activate the new paths.
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore(),uid='dynamic-integration';
  const candidate=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
  const other=prepareWorkoutFromPlan({plan,sessionId:'s2',requestId:'r2',now:2000});
  const started=await createDynamicWorkoutSession({db,uid,candidate,...dependencies});
  assert.equal(started.action,'create');
  await assert.rejects(
   ()=>createDynamicWorkoutSession({db,uid,candidate:other,...dependencies}),
   /Conflito: another-session-active/
  );
  const root=doc(db,'users',uid,'dynamicSessions','s1');
  const pointer=doc(db,'users',uid,'dynamicSessionControl','active');
  assert.equal((await getDoc(pointer)).data().sessionId,'s1');
  assert.deepEqual((await getDoc(root)).data().sets.map(row=>row.items.length),[3,4]);
  const finished=await finishDynamicWorkoutSession({
   db,uid,sessionId:'s1',endedAt:'1970-01-01T00:03:00.000Z',...dependencies
  });
  assert.equal(finished.action,'finish');
  assert.equal((await getDoc(root)).data().status,'completed');
  assert.equal((await getDoc(pointer)).data().sessionId,null);
  const repeated=await finishDynamicWorkoutSession({
   db,uid,sessionId:'s1',endedAt:'1970-01-01T00:03:00.000Z',...dependencies
  });
  assert.equal(repeated.action,'already-completed');
  const next=await createDynamicWorkoutSession({db,uid,candidate:other,...dependencies});
  assert.equal(next.action,'create');
  assert.equal((await getDoc(pointer)).data().sessionId,'s2');
  assert.equal((await getDoc(root)).data().status,'completed');
 });
});
