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
