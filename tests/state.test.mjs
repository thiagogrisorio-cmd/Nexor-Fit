import test from 'node:test';
import assert from 'node:assert/strict';
import {freshWorkout,changeWorkout,legacyWorkout} from '../state.js';
test('completion logs once per session and preserves original input',()=>{
 let state=freshWorkout('test-session'); const original=structuredClone(state);
 let completions=0;
 for(let i=0;i<12;i++){const result=changeWorkout(state,i,'done',true);state=result.next;completions+=Number(result.completed);}
 assert.deepEqual(original,freshWorkout('test-session'));assert.equal(completions,1);
 state=changeWorkout(state,11,'done',false).next;
 assert.equal(changeWorkout(state,11,'done',true).completed,false);
});
test('changing a weight never erases completion and rejects invalid loads',()=>{
 const current=freshWorkout('weights');current.exercises[2].done=true;
 const result=changeWorkout(current,2,'weight','37.5');
 assert.equal(result.next.exercises[2].done,true);assert.equal(result.next.exercises[2].weight,'37.5');assert.equal(current.exercises[2].weight,'');
 for(const value of ['-1','Infinity','NaN','2001'])assert.throws(()=>changeWorkout(current,2,'weight',value));
});
test('legacy import preserves valid data and sanitizes invalid weights',()=>{
 const result=legacyWorkout(0,{'0-0':{done:true,weight:'42.5'},'0-1':{weight:'-3'}},{0:true});
 assert.equal(result.exercises.length,12);assert.deepEqual(result.exercises[0],{done:true,weight:'42.5'});assert.equal(result.exercises[1].weight,'');assert.equal(result.logged,true);
});

