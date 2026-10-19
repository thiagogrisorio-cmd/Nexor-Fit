import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWorkoutFromPlan,planSessionCreation} from '../workout-plan-session.js';
import {reviseWorkoutPlan,archiveWorkoutPlan} from '../workout-plan-model.js';
const plan={id:'my-plan',name:'Livre',origin:'manual',exercises:[{id:'a',name:'Agachamento',muscleGroup:'Pernas',sets:3,reps:'8-12'},{id:'b',name:'Remada',muscleGroup:'Costas',sets:4,reps:'10'}]};
test('dynamic sessions preserve variable set counts and immutable prescription',()=>{
 const session=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
 assert.deepEqual(session.sets.map(x=>x.length),[3,4]);
 const updated=reviseWorkoutPlan(plan,{exercises:[{...plan.exercises[0],sets:5}]});
 const archived=archiveWorkoutPlan(updated);
 assert.equal(archived.archived,true);
 assert.equal(session.prescription.exercises[0].sets,3);
 assert.equal(session.planRevision,1);
 assert.equal(plan.exercises[0].sets,3);
});
test('retry reuses same session request and refuses duplicate active sessions',()=>{
 const candidate=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
 assert.deepEqual(planSessionCreation({candidate,existing:null,activeSessionId:null}),{action:'create',sessionId:'s1'});
 assert.deepEqual(planSessionCreation({candidate,existing:candidate,activeSessionId:'s1'}),{action:'reuse',sessionId:'s1'});
 assert.equal(planSessionCreation({candidate,existing:{...candidate,requestId:'other'},activeSessionId:null}).action,'conflict');
 assert.equal(planSessionCreation({candidate,existing:null,activeSessionId:'s2'}).action,'conflict');
});
