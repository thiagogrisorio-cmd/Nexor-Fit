import test from 'node:test';
import assert from 'node:assert/strict';
import {workoutPreviewProgress} from '../nexor-visual-progress.js';
const exercise=(sets)=>({sets});
const set=(done=false)=>({done});
test('variable exercise and set counts produce accurate progress',()=>{
 const p=workoutPreviewProgress({exercises:[exercise(2),exercise(3)],sets:[
  [set(true),set(true)],[set(true),set(false),set(false)]
 ],elapsedSeconds:94.8});
 assert.deepEqual(p,{totalExercises:2,completedExercises:1,totalSets:5,completedSets:3,percent:60,elapsedSeconds:94});
});
test('all sets complete yields 100 percent independent of workout size',()=>{
 const p=workoutPreviewProgress({exercises:[exercise(1)],sets:[[set(true)]]});
 assert.equal(p.percent,100);assert.equal(p.completedExercises,1);
});
test('rejects mismatched or invalid rows instead of displaying misleading progress',()=>{
 assert.throws(()=>workoutPreviewProgress({exercises:[exercise(3)],sets:[[set()]]}),/incompatíveis/);
 assert.throws(()=>workoutPreviewProgress({exercises:[exercise(1)],sets:[[{}]]}),/inválido/);
 assert.throws(()=>workoutPreviewProgress({exercises:[],sets:[],elapsedSeconds:-1}),/Tempo/);
});
