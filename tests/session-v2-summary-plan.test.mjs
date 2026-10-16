import test from 'node:test';
import assert from 'node:assert/strict';
import {planCompletedV2Summary} from '../session-v2-summary-plan.js';
const metadata={id:'session-1',schemaVersion:2,status:'completed',endedAt:'2026-10-16T10:00:00.000Z',day:0,durationSeconds:300};
const exercises=()=>Array.from({length:12},(_,index)=>({index,sessionId:'session-1',sets:[{done:true,completedAt:'2026-10-16T10:00:00.000Z'},{done:false,completedAt:null}]}));
test('creates deterministic V2 summary from complete exercise snapshot',()=>{
 const result=planCompletedV2Summary({metadata,exercises:exercises()});
 assert.equal(result.action,'create');assert.equal(result.summary.completedSets,12);assert.equal(result.summary.totalSets,24);
 assert.equal(planCompletedV2Summary({metadata,exercises:exercises(),existing:result.summary}).action,'unchanged');
});
test('rejects inconsistent existing summary rather than overwriting',()=>{
 const summary=planCompletedV2Summary({metadata,exercises:exercises()}).summary;
 assert.throws(()=>planCompletedV2Summary({metadata,exercises:exercises(),existing:{...summary,completedSets:24}}),/Conflito/);
});
test('rejects active V2 workout',()=>assert.throws(()=>planCompletedV2Summary({metadata:{...metadata,status:'active'},exercises:exercises()}),/não concluída/));
test('rejects incomplete exercise snapshot',()=>assert.throws(()=>planCompletedV2Summary({metadata,exercises:exercises().slice(1)}),/incompletos/));
