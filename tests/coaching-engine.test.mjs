import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {generateProgram,validateProgram,replaceExercise,reviewStatus} from '../coaching-engine.js';
import {EXERCISES,EQUIPMENT,exerciseById,compatibleExercises} from '../coaching-catalog.js';
import {exerciseGuide} from '../exercise-guides.js';
const profile={level:'basic',goal:'muscle',focus:'balanced',days:3,minutes:30,equipment:[],adult:true};
test('programmes fit time, experience and actual equipment across all supported schedules',()=>{
 for(const level of ['basic','intermediate','advanced'])for(const goal of ['muscle','weight','endurance','strength','fitness'])for(const days of [2,3,4,5,6])for(const minutes of [20,30,45,60,75])for(const equipment of [[],['dumbbells'],Object.keys(EQUIPMENT)]){
  const p=generateProgram({...profile,level,goal,days,minutes,equipment});assert.deepEqual(validateProgram(p),p);assert.equal(p.days.length,days);
  for(const d of p.days)assert.ok(d.estimatedMinutes<=minutes);
 }
});
test('replacement keeps pattern and excludes unavailable equipment, difficulty and duplicates',()=>{
 const p=generateProgram(profile),row=p.days[0].exercises.findIndex(e=>exerciseById(e.id).pattern==='push-horizontal'),id=p.days[0].exercises[row].id;
 const options=compatibleExercises(id,profile,p.days[0].exercises.map(e=>e.id));assert.ok(options.length);for(const e of options){assert.equal(e.pattern,'push-horizontal');assert.deepEqual(e.equipment,[]);assert.equal(e.level,0);}
 const next=replaceExercise(p,0,row,options[0].id);assert.notEqual(next.days[0].exercises[row].id,id);assert.equal(p.days[0].exercises[row].id,id);
 assert.throws(()=>replaceExercise(p,0,row,EXERCISES.find(e=>e.pattern==='pull-vertical').id),/incompatível/);
});
test('90-day review invites a choice without automatic advancement or edits',()=>{
 const start='2026-01-01T00:00:00.000Z',p={createdAt:start,reviewedAt:start};assert.equal(reviewStatus(p,Date.parse(start)+89*86400000).due,false);assert.equal(reviewStatus(p,Date.parse(start)+90*86400000).due,true);assert.equal(reviewStatus({...p,reviewedAt:'2026-03-31T00:00:00.000Z'},Date.parse('2026-04-01')).due,false);assert.deepEqual(p,{createdAt:start,reviewedAt:start});
});
test('every suggested exercise has complete equipment and technique instructions',()=>{for(const e of EXERCISES){const g=exerciseGuide(e.name);assert.ok(g,e.name);assert.ok(g.setup&&g.machine&&g.accessories,e.name);}});
test('incomplete or invalid profiles do not silently generate a workout',()=>{assert.throws(()=>generateProgram({...profile,adult:false}));assert.throws(()=>generateProgram({...profile,equipment:['imaginary']}));assert.throws(()=>generateProgram({...profile,days:7}));});
