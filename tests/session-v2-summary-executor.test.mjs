import test from 'node:test';
import assert from 'node:assert/strict';
import {executeV2Summary} from '../session-v2-summary-executor.js';
function fakeStore(){
 const data=new Map();
 const uid='tester',sid='workout-1';
 data.set(`users/${uid}/sessions/${sid}`,{id:sid,schemaVersion:2,status:'completed',endedAt:'2026-10-16T10:00:00.000Z',day:0,durationSeconds:120});
 for(let i=0;i<12;i++)data.set(`users/${uid}/sessions/${sid}/exercises/${i}`,{index:i,sessionId:sid,sets:[{done:true,completedAt:'2026-10-16T10:00:00.000Z'},{done:false,completedAt:null}]});
 const store={doc:path=>path,runTransaction:async fn=>fn({get:async path=>({exists:data.has(path),data:()=>data.get(path)}),create:(path,value)=>{if(data.has(path))throw Error('Already exists');data.set(path,value);}})};
 return {store,data,uid,sid};
}
test('executor writes once and reruns without duplicating summary',async()=>{
 const {store,uid,sid,data}=fakeStore();
 assert.equal((await executeV2Summary({store,uid,sessionId:sid})).action,'create');
 assert.equal((await executeV2Summary({store,uid,sessionId:sid})).action,'unchanged');
 assert.equal(data.get(`users/${uid}/sessionSummaries/${sid}`).completedSets,12);
});
test('executor rejects tampered summary without overwriting',async()=>{
 const {store,uid,sid,data}=fakeStore();
 data.set(`users/${uid}/sessionSummaries/${sid}`,{sessionId:sid,completedSets:24,totalSets:24});
 await assert.rejects(executeV2Summary({store,uid,sessionId:sid}),/Conflito/);
 assert.equal(data.get(`users/${uid}/sessionSummaries/${sid}`).completedSets,24);
});
test('executor rejects active sessions',async()=>{
 const {store,uid,sid,data}=fakeStore();
 data.get(`users/${uid}/sessions/${sid}`).status='active';
 await assert.rejects(executeV2Summary({store,uid,sessionId:sid}),/não concluída/);
});
