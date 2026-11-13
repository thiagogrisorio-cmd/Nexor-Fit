import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTrainingPlan,validatePrescription,projectLoadTrend,exerciseIdentity} from '../training-prescription.js';
import {createV2Workout} from '../session-v2-repository.js';
import {startSession} from '../workout-session.js';
const exercises=()=>Array.from({length:12},(_,i)=>`Costas|Exercício ${i}|8–12`);
test('prescription validation keeps 12 slots and rejects malformed/oversized fields',()=>{
 assert.equal(validatePrescription(exercises()).length,12);
 for(const invalid of [exercises().slice(0,11),exercises().map((x,i)=>i===5?'Nome sem grupo':x),exercises().map((x,i)=>i===8?'Grupo|'+'x'.repeat(121)+'|10':x)])assert.throws(()=>validatePrescription(invalid));
 assert.throws(()=>validateTrainingPlan({revision:0,focus:'Costas',exercises:exercises()}));
});
test('session receives a detached prescription snapshot rather than the editable plan',async()=>{
 const session=startSession({id:'snapshot',day:0,now:0});session.prescription=exercises();const writes=[];
 await createV2Workout({db:{},uid:'owner',session,doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,run)=>run({get:async()=>({exists:()=>false}),set:(path,data)=>writes.push({path,data})}),serverTimestamp:()=>1});
 session.prescription[0]='Outro|Outro exercício|15';
 assert.equal(writes[0].data.prescription[0],'Costas|Exercício 0|8–12');
});
test('load trend includes zero but never invents missing weights or includes unfinished sets',()=>{
 const trend=projectLoadTrend([{id:'later',at:2,sets:[{done:true,weightKg:30},{done:false,weightKg:99}]},{id:'empty',at:3,sets:[{done:true}]},{id:'first',at:1,sets:[{done:true,weightKg:0}]}]);
 assert.deepEqual(trend.map(row=>row.weight),[0,30]);assert.equal(exerciseIdentity('Costas|  REMADA |10'),exerciseIdentity('Costas|remada|12'));
});
