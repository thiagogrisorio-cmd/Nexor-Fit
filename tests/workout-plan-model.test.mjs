import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkoutPlan,reviseWorkoutPlan,snapshotWorkoutPrescription,archiveWorkoutPlan} from '../workout-plan-model.js';
const plan={id:'user-plan-1',name:'Treino livre',origin:'manual',exercises:[{id:'squat',name:'Agachamento',muscleGroup:'Pernas',sets:3,reps:'8-12',restSeconds:90}]};
test('custom plans are not restricted to A/B/C/D or 12x2',()=>{
 const valid=validateWorkoutPlan(plan);
 assert.equal(valid.exercises.length,1);
 assert.equal(valid.exercises[0].sets,3);
});
test('editing and archiving preserve an independent historical prescription',()=>{
 const historical=snapshotWorkoutPrescription(plan);
 const edited=reviseWorkoutPlan(plan,{name:'Treino atualizado',exercises:[{...plan.exercises[0],sets:4}]});
 const archived=archiveWorkoutPlan(edited);
 assert.equal(historical.name,'Treino livre');
 assert.equal(historical.exercises[0].sets,3);
 assert.equal(edited.revision,2);
 assert.equal(archived.archived,true);
 assert.equal(plan.exercises[0].sets,3);
});
test('plan rejects duplicate exercise ids and invalid prescription',()=>{
 assert.throws(()=>validateWorkoutPlan({...plan,exercises:[plan.exercises[0],plan.exercises[0]]}),/duplicado/);
 assert.throws(()=>validateWorkoutPlan({...plan,exercises:[{...plan.exercises[0],sets:0}]}),/Séries/);
});
