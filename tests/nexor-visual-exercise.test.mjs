import test from 'node:test';
import assert from 'node:assert/strict';
import {assessExerciseSetDraft} from '../nexor-visual-exercise.js';
const draft=changes=>assessExerciseSetDraft({exercise:{sets:3},setIndex:1,weightKg:20,repetitions:8,...changes});
test('validates variable set positions and measured load',()=>{
 assert.deepEqual(draft({}),{valid:true,setIndex:1,weightKg:20,repetitions:8});
 assert.equal(draft({exercise:{sets:1},setIndex:0}).valid,true);
 assert.equal(draft({exercise:{sets:12},setIndex:11}).valid,true);
});
test('rejects invalid loads and repetition counts',()=>{
 for(const weightKg of [-1,Infinity,NaN,2001,'20'])assert.equal(draft({weightKg}).valid,false);
 for(const repetitions of [-1,1001,2.5,'8'])assert.equal(draft({repetitions}).valid,false);
});
test('rejects invalid set indexes',()=>{
 for(const setIndex of [-1,3,1.5])assert.equal(draft({setIndex}).valid,false);
});
