import test from 'node:test';
import assert from 'node:assert/strict';
import {executeV2Summary} from '../functions/session-v2-summary-executor.js';
import {planCompletedV2Summary} from '../session-v2-summary-plan.js';
const sample=()=>({metadata:{id:'sample',schemaVersion:2,status:'completed',endedAt:'2026-10-16T10:00:00.000Z',day:0,durationSeconds:60},exercises:Array.from({length:12},(_,index)=>({index,sessionId:'sample',sets:[{done:index%2===0,completedAt:null},{done:false,completedAt:null}]}))});
test('backend bundle and shared planner produce identical summary',()=>{
 const {metadata,exercises}=sample();
 const expected=planCompletedV2Summary({metadata,exercises});
 assert.equal(expected.summary.completedSets,6);
 assert.equal(typeof executeV2Summary,'function');
});
