import test from 'node:test';
import assert from 'node:assert/strict';
import {planWorkoutPublication} from '../workout-plan-publish.js';
const manifest={planId:'p1',revision:2,status:'draft',name:'Treino livre',origin:'manual',exerciseIds:['a','b']};
const exercise=(id,order)=>({id,order,revision:2,name:id,muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90});
const input={planId:'p1',revision:2,manifest,exerciseDocuments:[exercise('a',0),exercise('b',1)],planRecord:{id:'p1',archived:false,publishedRevision:1},expectedPublishedRevision:1};
const check=changes=>planWorkoutPublication({...input,...changes});
test('complete revision produces a publish intent without changing source',()=>{
 const result=check({});
 assert.equal(result.action,'publish');
 assert.equal(result.previousPublishedRevision,1);
 assert.deepEqual(result.prescription.exercises.map(x=>x.id),['a','b']);
 assert.equal(input.planRecord.publishedRevision,1);
});
test('stale compare-and-swap and older revisions conflict',()=>{
 assert.deepEqual(check({expectedPublishedRevision:0}),{action:'conflict',reason:'stale-published-revision'});
 assert.equal(check({planRecord:{...input.planRecord,publishedRevision:2}}).action,'conflict');
 assert.equal(check({planRecord:{...input.planRecord,publishedRevision:2},expectedPublishedRevision:2}).reason,'revision-not-newer');
});
test('incomplete, malformed or archived plans never publish',()=>{
 assert.equal(check({exerciseDocuments:[exercise('a',0)]}).action,'reject');
 assert.equal(check({planRecord:{...input.planRecord,archived:true}}).action,'reject');
 assert.equal(check({manifest:{...manifest,status:'published'}}).action,'reject');
 assert.equal(check({exerciseDocuments:[exercise('a',0),{...exercise('b',1),sets:13}]}).action,'reject');
});
