import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWorkoutHistory,summarizeWorkoutEvolution} from '../nexor-visual-history.js';
const session=(id,endedAt,sets)=>({id,name:'Treino '+id,endedAt,durationSeconds:1800,exercises:[{sets}]});
test('history is sorted and uses session snapshots, not mutable plans',()=>{
 const original=[session('older',100,[{done:true,weightKg:20,repetitions:10}]),session('newer',200,[{done:true,weightKg:30,repetitions:8}])];
 const snapshot=structuredClone(original);
 const result=summarizeWorkoutHistory(original);
 assert.deepEqual(result.map(x=>x.id),['newer','older']);
 assert.equal(result[0].volumeKg,240);
 assert.deepEqual(original,snapshot);
});
test('evolution aggregates completed sets and ignores unfinished set volume',()=>{
 const result=summarizeWorkoutEvolution([session('a',100,[{done:true,weightKg:20,repetitions:10},{done:false,weightKg:50,repetitions:10}])]);
 assert.equal(result.totalCompletedSets,1);assert.equal(result.totalVolumeKg,200);
 assert.equal(result.totalDurationSeconds,1800);
});
test('rejects invalid historical data',()=>{
 assert.throws(()=>summarizeWorkoutHistory([session('a',100,[{done:true,weightKg:-2,repetitions:10}])]),/Série/);
 assert.throws(()=>summarizeWorkoutHistory([session('a',100,[{done:'yes'}])]),/Série/);
});
