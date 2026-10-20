import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRestDuration,restTimerState,adjustRestDuration} from '../nexor-visual-rest.js';
test('countdown finishes at zero and never becomes negative',()=>{
 assert.deepEqual(restTimerState({durationSeconds:90,elapsedSeconds:30}),{durationSeconds:90,remainingSeconds:60,finished:false,progressPercent:33});
 assert.equal(restTimerState({durationSeconds:90,elapsedSeconds:100}).remainingSeconds,0);
 assert.equal(restTimerState({durationSeconds:0,elapsedSeconds:0}).finished,true);
});
test('rest adjustments are bounded from zero to ten minutes',()=>{
 assert.equal(adjustRestDuration({durationSeconds:90,elapsedSeconds:10,deltaSeconds:15}),105);
 assert.equal(adjustRestDuration({durationSeconds:5,elapsedSeconds:0,deltaSeconds:-15}),0);
 assert.equal(adjustRestDuration({durationSeconds:595,elapsedSeconds:0,deltaSeconds:15}),600);
});
test('rejects malformed durations and invalid elapsed time',()=>{
 for(const value of [-1,601,1.5,Infinity])assert.throws(()=>validateRestDuration(value),/Descanso/);
 assert.throws(()=>restTimerState({durationSeconds:90,elapsedSeconds:-1}),/decorrido/);
 assert.throws(()=>adjustRestDuration({durationSeconds:90,elapsedSeconds:0,deltaSeconds:1.5}),/Ajuste/);
});
