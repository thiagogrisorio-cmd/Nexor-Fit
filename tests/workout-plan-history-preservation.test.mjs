import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkoutPlan,reviseWorkoutPlan,archiveWorkoutPlan} from '../workout-plan-model.js';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {encodeDynamicSession,decodeDynamicSession} from '../workout-plan-firestore-codec.js';
import {planDynamicSessionFinish} from '../workout-plan-finish.js';

const original={id:'personal-plan',name:'Meu treino',origin:'manual',revision:1,exercises:[
 {id:'row',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90},
 {id:'squat',name:'Agachamento',muscleGroup:'Pernas',sets:4,reps:'8',restSeconds:120}
]};
const startedAt=Date.parse('2026-10-01T10:00:00.000Z');
const create=()=>prepareWorkoutFromPlan({plan:original,sessionId:'session-1',requestId:'request-1',now:startedAt});
test('revising a plan cannot rewrite the prescription of an existing session',()=>{
 const session=create();
 const before=structuredClone(session.prescription);
 const revised=reviseWorkoutPlan(original,{name:'Novo treino',exercises:[
  {id:'press',name:'Supino',muscleGroup:'Peito',sets:5,reps:'6',restSeconds:180}
 ]});
 assert.equal(revised.revision,2);
 assert.equal(revised.exercises.length,1);
 assert.deepEqual(session.prescription,before);
 assert.deepEqual(session.prescription.exercises.map(e=>e.sets),[3,4]);
 assert.equal(session.planRevision,1);
});
test('archiving a plan leaves the historical snapshot and completed set weights intact',()=>{
 const session=create();
 session.sets[0][0]={done:true,completedAt:'2026-10-01T10:02:00.000Z',weightKg:32.5};
 const archived=archiveWorkoutPlan(original);
 assert.equal(archived.archived,true);
 const persisted=decodeDynamicSession(encodeDynamicSession(session));
 assert.equal(persisted.sets[0][0].weightKg,32.5);
 assert.equal(persisted.prescription.exercises[0].name,'Remada');
 assert.equal(persisted.planRevision,1);
});
test('a replacement plan cannot change the exercise count of an earlier session',()=>{
 const earlier=create();
 const replacement=validateWorkoutPlan({id:'replacement',name:'Plano novo',origin:'recommended',exercises:[
  {id:'press',name:'Supino',muscleGroup:'Peito',sets:2,reps:'12'}
 ]});
 const later=prepareWorkoutFromPlan({plan:replacement,sessionId:'session-2',requestId:'request-2',now:startedAt+60000});
 assert.equal(earlier.planId,'personal-plan');
 assert.equal(earlier.sets.length,2);
 assert.equal(later.planId,'replacement');
 assert.equal(later.sets.length,1);
 assert.deepEqual(earlier.prescription.exercises.map(e=>e.id),['row','squat']);
});
test('completed session retains its snapshot after the original plan is revised',()=>{
 const session=create();
 const before=structuredClone(session.prescription);
 const outcome=planDynamicSessionFinish({
  sessionId:session.id,sessionDocument:encodeDynamicSession(session),
  activePointer:{sessionId:session.id},endedAt:'2026-10-01T10:30:00.000Z'
 });
 assert.equal(outcome.action,'finish');
 reviseWorkoutPlan(original,{name:'Treino revisado'});
 assert.deepEqual(session.prescription,before);
});
