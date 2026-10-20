import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {encodeDynamicSession} from '../workout-plan-firestore-codec.js';
import {assessDynamicSessionResume} from '../workout-plan-resume.js';
const plan={id:'p1',name:'Livre',origin:'manual',exercises:[{id:'e1',name:'Agachamento',muscleGroup:'Pernas',sets:3,reps:'8-12'}]};
const session=encodeDynamicSession(prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000}));
const input={sessionId:'s1',sessionDocument:session,activePointer:{sessionId:'s1'},uid:'alice',ownerUid:'alice'};
test('resume returns read-only dynamic session with progress',()=>{
 const result=assessDynamicSessionResume(input);
 assert.equal(result.action,'resume');
 assert.equal(result.progress.totalSets,3);
 assert.equal(result.progress.completedSets,0);
 assert.deepEqual(result.session.sets.map(row=>row.length),[3]);
 assert.deepEqual(input.sessionDocument,session);
});
test('resume blocks account mismatch and completed sessions',()=>{
 assert.equal(assessDynamicSessionResume({...input,uid:'bob'}).reason,'account-mismatch');
 assert.equal(assessDynamicSessionResume({...input,sessionDocument:{...session,status:'completed'}}).reason,'session-not-active');
});
test('resume sends inconsistent pointer and malformed data to manual review',()=>{
 assert.equal(assessDynamicSessionResume({...input,activePointer:{sessionId:'other'}}).action,'manual-review');
 assert.equal(assessDynamicSessionResume({...input,sessionDocument:{...session,sets:[{items:[]}]}}).reason,'invalid-session-data');
});
