import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeDynamicSession,decodeDynamicSession} from '../workout-plan-firestore-codec.js';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
const plan={id:'p1',name:'Livre',origin:'manual',exercises:[{id:'a',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'},{id:'b',name:'Agachamento',muscleGroup:'Pernas',sets:4,reps:'8'}]};
test('dynamic session codec avoids nested arrays and round trips variable sets',()=>{
 const session=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
 session.sets[0][0].weightKg=25;
 const encoded=encodeDynamicSession(session);
 assert.deepEqual(encoded.sets.map(row=>row.items.length),[3,4]);
 assert.equal(Array.isArray(encoded.sets[0]),false);
 assert.deepEqual(decodeDynamicSession(encoded),session);
 assert.deepEqual(session.sets.map(row=>row.length),[3,4]);
});
test('codec rejects malformed set count and unsafe weights',()=>{
 const session=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
 session.sets[0].pop();
 assert.throws(()=>encodeDynamicSession(session),/incompatíveis/);
 const valid=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:1000});
 valid.sets[0][0].weightKg=-1;
 assert.throws(()=>encodeDynamicSession(valid),/Carga/);
});
