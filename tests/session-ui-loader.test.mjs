import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {prepareV2SessionDocuments} from '../session-exercise-schema-v2.js';
import {loadWorkoutForUI} from '../session-ui-loader.js';
const session=startSession({id:'ui-loader',day:0,now:0});
const {metadata,exercises}=prepareV2SessionDocuments(session);
const doc=(_db,...parts)=>parts.join('/');
function adapter(missing=-1){return {db:{},uid:'owner',sessionId:session.id,doc,getDoc:async path=>{const last=Number(path.split('/').at(-1));const data=path.endsWith('/'+session.id)?metadata:exercises[last];return {exists:()=>data!==undefined&&last!==missing,data:()=>data};}};}
test('loads V2 without permitting legacy writes',async()=>{const result=await loadWorkoutForUI(adapter());assert.equal(result.status,'ready');assert.equal(result.readOnly,true);assert.equal(result.session.sets.length,12);});
test('returns incomplete instead of showing partial V2 data',async()=>{const result=await loadWorkoutForUI(adapter(5));assert.equal(result.status,'incomplete');assert.equal(result.readOnly,true);});
