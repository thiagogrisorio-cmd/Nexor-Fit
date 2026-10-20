import test from 'node:test';
import assert from 'node:assert/strict';
import {assessExerciseTransition} from '../nexor-visual-transition.js';
const exercise=(name,sets)=>({name,sets,reps:'8–10',restSeconds:90});
const done=()=>({done:true}),pending=()=>({done:false});
test('advances to next exercise using variable prescription',()=>{
 const result=assessExerciseTransition({exercises:[exercise('A',1),exercise('B',3)],sets:[[done()],[pending(),pending(),pending()]],currentIndex:0});
 assert.deepEqual(result,{action:'next-exercise',completedIndex:0,nextIndex:1,nextExercise:{name:'B',sets:3,reps:'8–10',restSeconds:90}});
});
test('does not advance before all sets are completed',()=>{
 assert.equal(assessExerciseTransition({exercises:[exercise('A',2)],sets:[[done(),pending()]],currentIndex:0}).action,'incomplete');
});
test('marks final exercise as workout complete',()=>{
 assert.equal(assessExerciseTransition({exercises:[exercise('A',1)],sets:[[done()]],currentIndex:0}).action,'workout-complete');
});
test('rejects inconsistent exercise rows and indexes',()=>{
 assert.equal(assessExerciseTransition({exercises:[exercise('A',2)],sets:[[done()]],currentIndex:0}).action,'invalid');
 assert.equal(assessExerciseTransition({exercises:[exercise('A',1)],sets:[[done()]],currentIndex:2}).action,'invalid');
});
