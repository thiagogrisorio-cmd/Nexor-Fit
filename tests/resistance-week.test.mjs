import {exerciseCategory} from '../resistance-metadata.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {generateProgram,validateProgram,encodeProgramDays,decodeProgramDays,replaceExercise} from '../coaching-engine.js';
import {dayEnvironment,equipmentForDay} from '../cardio-model.js';import {exerciseById,EXERCISES} from '../coaching-catalog.js';import {assessResistanceWeek,estimateSessionMinutes} from '../resistance-week.js';
const target={level:'basic',goal:'muscle',focus:'balanced',days:3,minutes:30,equipment:[],adult:true,environment:'hybrid',gymDays:2,cardioLevel:'light',cardioMinutes:15};
test('reported 2-gym/1-home case has two loaded full-body bases and one complementary session',()=>{
 const plan=generateProgram(target);assert.equal(plan.profile.plannerVersion,2);assert.deepEqual(plan.days.map((d,i)=>dayEnvironment(plan.profile,i)),['gym','home','gym']);
 for(const i of [0,2]){const rows=plan.days[i].exercises.map(r=>exerciseById(r.id));assert.ok(rows.some(e=>e.pattern==='squat'&&e.equipment.length));assert.ok(rows.some(e=>e.pattern.startsWith('pull-')&&e.equipment.length));assert.ok(rows.some(e=>e.pattern==='push-horizontal'&&e.equipment.length));assert.ok(rows.every(e=>e.name!=='Flexão de braços na parede'));}
 const home=plan.days[1].exercises.map(r=>exerciseById(r.id));assert.ok(home.every(e=>!e.equipment.length));assert.ok(home.some(e=>e.pattern==='lunge'));assert.ok(home.some(e=>e.pattern==='core'));assert.ok(home.every(e=>e.pattern!=='scapular'));
 assert.ok(assessResistanceWeek(plan).frequency.Costas>=2);assert.deepEqual(validateProgram(plan),plan);
});
test('all supported environment combinations fit budget with per-side execution and bounded weekly loading',()=>{
 for(const environment of ['gym','home','hybrid'])for(const level of ['basic','intermediate','advanced'])for(const goal of ['muscle','strength','endurance','fitness','weight'])for(const days of [2,3,4,5,6])for(const minutes of [20,30,45,60,75]){
  for(const gymDays of environment==='hybrid'?Array.from({length:days-1},(_,i)=>i+1):[environment==='gym'?days:0]){
   const plan=generateProgram({...target,environment,level,goal,days,minutes,gymDays});assert.deepEqual(validateProgram(plan),plan);
   for(const [index,day]of plan.days.entries()){assert.ok(day.estimatedMinutes<=minutes);assert.ok(day.exercises.length>=2&&day.exercises.length<=6);let assistance=false;for(const row of day.exercises){if(exerciseCategory(exerciseById(row.id))==='accessory')assistance=true;else assert.equal(assistance,false,'Compound exercises must precede accessories');}if(dayEnvironment(plan.profile,index)==='home')assert.ok(day.exercises.every(r=>exerciseById(r.id).equipment.length===0));}
  }
 }
});
test('a single gym day never claims a second equivalent pull session at home',()=>{const plan=generateProgram({...target,days:4,gymDays:1});const report=assessResistanceWeek(plan);assert.equal(report.frequency.Costas,1);assert.ok(report.warnings.some(w=>w.includes('Costas com resistência')));assert.ok(plan.days.flatMap(d=>d.exercises).every(r=>exerciseById(r.id).pattern!=='scapular'));});
test('unilateral time includes execution of both sides',()=>{const lunge=EXERCISES.find(e=>e.name==='Afundo estático com peso corporal'),squat=EXERCISES.find(e=>e.name==='Agachamento com peso corporal');const row={sets:2,reps:10,restSeconds:90};assert.ok(estimateSessionMinutes([{...row,id:lunge.id}])>estimateSessionMinutes([{...row,id:squat.id}]));});
test('saving a profile again does not randomly shuffle stable foundation exercises',()=>{assert.deepEqual(generateProgram(target,{variation:1}),generateProgram(target,{variation:90}));});
test('new prescriptions encode symmetrically and old environment ordering stays unchanged',()=>{const plan=generateProgram(target);assert.deepEqual(decodeProgramDays(encodeProgramDays(plan.days)),plan.days);const legacy={...target};assert.deepEqual([0,1,2].map(i=>dayEnvironment(legacy,i)),['home','gym','gym']);});
test('a home day adjacent to a loaded lower-body day becomes a lower-overlap complement',()=>{
 const plan=generateProgram({...target,days:6,gymDays:5});const index=plan.days.findIndex((d,i)=>dayEnvironment(plan.profile,i)==='home');assert.ok(index>=0);assert.ok(plan.days[index].name.includes('Core e complemento'));assert.ok(plan.days[index].exercises.every(r=>['core','calves'].includes(exerciseById(r.id).pattern)));
});
