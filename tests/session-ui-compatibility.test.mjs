import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {encodeSessionForFirestore} from '../firestore-session-codec.js';
import {prepareV2SessionDocuments} from '../session-exercise-schema-v2.js';
import {decodeWorkoutForUI} from '../session-ui-compatibility.js';
const session=startSession({id:'ui-compat',day:0,now:0});
test('UI decoder reads V1 without changing its 12x2 sets',()=>{
 const input=encodeSessionForFirestore(session);
 const result=decodeWorkoutForUI({metadata:input});
 assert.equal(result.format,'v1');
 assert.equal(result.readOnly,false);
 assert.deepEqual(result.session.sets,session.sets);
});
test('UI decoder reads complete V2 in read-only mode',()=>{
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 const result=decodeWorkoutForUI({metadata,exerciseDocuments:exercises});
 assert.equal(result.format,'v2');
 assert.equal(result.readOnly,true);
 assert.deepEqual(result.session.sets,session.sets);
});
test('UI decoder refuses incomplete V2 rather than displaying stale data',()=>{
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 assert.throws(()=>decodeWorkoutForUI({metadata,exerciseDocuments:exercises.slice(1)}),/carregados/);
});
test('UI decoder refuses unsupported version and mixed V1/V2 shape',()=>{
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 assert.throws(()=>decodeWorkoutForUI({metadata:{...metadata,sets:[]},exerciseDocuments:exercises}),/legadas/);
 assert.throws(()=>decodeWorkoutForUI({metadata:{...metadata,schemaVersion:3},exerciseDocuments:exercises}),/desconhecida/);
});

test('Nexor 2.0 projection keeps V1 unchanged and supplies safe optional defaults',async()=>{
 const {projectWorkoutForUI}=await import('../session-ui-compatibility.js');
 const original=encodeSessionForFirestore(session);
 const before=structuredClone(original);
 const projected=projectWorkoutForUI(decodeWorkoutForUI({metadata:original}));
 assert.equal(projected.sourceFormat,'v1');
 assert.equal(projected.exercises.length,12);
 assert.equal(projected.exercises[0].sets[0].weightKg,null);
 assert.deepEqual(projected.progress,{completedSets:0,totalSets:24,percent:0});
 assert.deepEqual(original,before);
});
test('Nexor 2.0 projection preserves independent per-set weights and progress',async()=>{
 const {projectWorkoutForUI}=await import('../session-ui-compatibility.js');
 const weighted=structuredClone(session);
 weighted.sets[0][0]={done:true,completedAt:'2026-10-19T10:00:00.000Z',weightKg:20};
 weighted.sets[0][1]={done:true,completedAt:'2026-10-19T10:01:00.000Z',weightKg:22.5};
 const {metadata,exercises}=prepareV2SessionDocuments(weighted);
 const projected=projectWorkoutForUI(decodeWorkoutForUI({metadata,exerciseDocuments:exercises}));
 assert.equal(projected.sourceFormat,'v2');
 assert.equal(projected.exercises[0].sets[0].weightKg,20);
 assert.equal(projected.exercises[0].sets[1].weightKg,22.5);
 assert.deepEqual(projected.progress,{completedSets:2,totalSets:24,percent:8});
 assert.equal(exercises[0].sets[1].weightKg,22.5);
});
test('Nexor 2.0 projection rejects malformed weights without writing anything',async()=>{
 const {projectWorkoutForUI}=await import('../session-ui-compatibility.js');
 const weighted=structuredClone(session);
 weighted.sets[0][0].weightKg=-3;
 const {metadata,exercises}=prepareV2SessionDocuments(weighted);
 assert.throws(()=>projectWorkoutForUI(decodeWorkoutForUI({metadata,exerciseDocuments:exercises})),/Carga inválida/);
});
