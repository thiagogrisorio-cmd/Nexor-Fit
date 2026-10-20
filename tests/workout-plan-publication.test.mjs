import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWorkoutPlanPublication} from '../workout-plan-publication.js';
const exercise=(id,order,revision=2)=>({id,order,revision,name:'Exercício '+id,muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90});
const manifest={planId:'p1',revision:2,status:'draft',name:'Plano personalizado',origin:'manual',exerciseIds:['a','b','c']};
const assess=(overrides={})=>assessWorkoutPlanPublication({
 planId:'p1',revision:2,manifest,exerciseDocuments:[exercise('a',0),exercise('b',1),exercise('c',2)],...overrides
});
test('complete draft revision can be prepared without modifying its inputs',()=>{
 const result=assess();
 assert.equal(result.action,'ready');
 assert.deepEqual(result.plan.exercises.map(x=>x.id),['a','b','c']);
 assert.equal(manifest.status,'draft');
});
test('missing child, wrong order, stale child revision and duplicate child are rejected',()=>{
 assert.equal(assess({exerciseDocuments:[exercise('a',0),exercise('b',1)]}).action,'reject');
 assert.equal(assess({exerciseDocuments:[exercise('a',0),exercise('b',2),exercise('c',1)]}).action,'reject');
 assert.equal(assess({exerciseDocuments:[exercise('a',0),exercise('b',1,1),exercise('c',2)]}).action,'reject');
 assert.equal(assess({exerciseDocuments:[exercise('a',0),exercise('a',1),exercise('c',2)]}).action,'reject');
});
test('duplicate manifest ids, already published manifest and invalid set count are rejected',()=>{
 assert.equal(assess({manifest:{...manifest,exerciseIds:['a','a','c']}}).action,'reject');
 assert.equal(assess({manifest:{...manifest,status:'published'}}).action,'reject');
 assert.equal(assess({exerciseDocuments:[exercise('a',0),{...exercise('b',1),sets:13},exercise('c',2)]}).action,'reject');
});
test('supports 100 variable exercises as a pure validation boundary',()=>{
 const ids=Array.from({length:100},(_,i)=>'e'+i);
 const result=assess({manifest:{...manifest,exerciseIds:ids},exerciseDocuments:ids.map((id,i)=>exercise(id,i))});
 assert.equal(result.action,'ready');
 assert.equal(result.plan.exercises.length,100);
});
