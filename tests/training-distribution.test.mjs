import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {generateProgram,validateProgram} from '../coaching-engine.js';import {EXERCISES,exerciseById} from '../coaching-catalog.js';import {exerciseGuide} from '../exercise-guides.js';
const base={adult:true,level:'basic',goal:'muscle',focus:'balanced',days:5,minutes:45,environment:'gym',gymDays:5,cardioLevel:'none',cardioMinutes:0,trainingStyle:'split',lowerDays:2,gender:'undisclosed'};
test('five-day split honors gender starting order and distinct lower-day emphases',()=>{
 for(const gender of ['female','male','undisclosed'])for(const lowerDays of [1,2,3]){
  const p=generateProgram({...base,gender,lowerDays});assert.deepEqual(validateProgram(p),p);const lower=p.days.filter(d=>d.name.includes('Inferiores'));assert.equal(lower.length,lowerDays);assert.equal(p.days[0].name.includes('Inferiores'),gender==='female');assert.equal(new Set(lower.map(d=>d.name.split('Inferiores')[1])).size,lowerDays);
  if(lowerDays>1){assert.ok(lower[0].name.includes('quadríceps'));assert.ok(lower[1].name.includes('posteriores'));assert.notDeepEqual(lower[0].exercises.map(r=>r.id),lower[1].exercises.map(r=>r.id));}
 }
});
test('full body covers lower, push and pull every gym session, and distributes daily volume',()=>{
 for(const days of [2,3,4,5,6])for(const level of ['basic','intermediate','advanced']){
  const plan=generateProgram({...base,trainingStyle:'fullbody',days,gymDays:days,level,minutes:45});assert.deepEqual(validateProgram(plan),plan);
  for(const d of plan.days){const patterns=d.exercises.map(r=>exerciseById(r.id).pattern);assert.ok(patterns.some(x=>['squat','hinge','bridge','lunge'].includes(x)));assert.ok(patterns.includes('push-horizontal'));assert.ok(patterns.some(x=>x.startsWith('pull-')));if(days>=4)assert.ok(d.exercises.every(r=>r.sets===2));}
 }
});
test('new catalogue preserves the first 61 IDs and provides complete guides and valid illustrations',()=>{
 assert.equal(EXERCISES.length,90);assert.equal(exerciseById('ex-061').name,'Barra fixa');assert.ok(EXERCISES.filter(e=>e.pattern==='core').length>=15);
 for(const e of EXERCISES){const g=exerciseGuide(e.name);for(const key of ['muscles','execution','tip','machine','accessories','setup','kind'])assert.ok(g[key],`${e.name}: ${key}`);for(const kind of [g.kind,g.attachment].filter(Boolean))assert.match(readFileSync(new URL('../assets/equipment/'+kind+'.svg',import.meta.url),'utf8'),/<svg/);}
 const p=generateProgram(base);const core=p.days.flatMap(d=>d.exercises.map(r=>exerciseById(r.id))).filter(e=>e.pattern==='core');assert.ok(new Set(core.map(e=>e.group)).size>=3);assert.ok(core.some(e=>e.name==='Abdominal na máquina'));
});
test('hybrid/home prescriptions respect equipment and chosen lower-day counts across schedules',()=>{
 for(const environment of ['gym','home','hybrid'])for(const days of [2,3,4,5,6])for(const lowerDays of [1,2,3])for(const gender of ['male','female']){
  const plan=generateProgram({...base,environment,days,gymDays:environment==='gym'?days:environment==='home'?0:Math.max(1,days-2),lowerDays,gender,minutes:30});assert.deepEqual(validateProgram(plan),plan);if(days>4)assert.equal(plan.days.filter(d=>d.name.includes('Inferiores')).length,lowerDays);
 }
});
test('invalid style, lower-day counts and gender fail instead of silently changing choices',()=>{
 for(const change of [{trainingStyle:'unknown'},{lowerDays:0},{lowerDays:4},{gender:'unknown'}])assert.throws(()=>generateProgram({...base,...change}));
 assert.throws(()=>generateProgram({...base,trainingStyle:'fullbody',minutes:20,goal:'strength'}),/30 minutos/);
});
