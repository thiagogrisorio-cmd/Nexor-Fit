import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createV2SummaryTriggerHandler} from './session-v2-summary-trigger.js';
const emulator=process.env.FIRESTORE_EMULATOR_HOST;
test('Functions event adapter: completed V2 writes summary and repeated event is ignored',{skip:!emulator},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'summary-event-test');
 try{
  const db=getFirestore(app),uid='summary-event-test',sessionId='completed-event';
  const parent=db.doc(`users/${uid}/sessions/${sessionId}`);
  const summary=db.doc(`users/${uid}/sessionSummaries/${sessionId}`);
  const batch=db.batch();
  batch.set(parent,{id:sessionId,schemaVersion:2,status:'completed',day:1,endedAt:'2026-10-16T10:00:00.000Z',durationSeconds:180});
  for(let i=0;i<12;i++)batch.set(db.doc(`users/${uid}/sessions/${sessionId}/exercises/${i}`),{index:i,sessionId,sets:[{done:true,completedAt:null},{done:false,completedAt:null}]});
  await batch.commit();
  const messages=[];
  const handle=createV2SummaryTriggerHandler({store:db,logger:{info:(name,value)=>messages.push({name,value})}});
  const event={params:{uid,sessionId},data:{before:{data:()=>({status:'active'})},after:{data:()=>({id:sessionId,schemaVersion:2,status:'completed'})}}};
  assert.equal((await handle(event)).action,'create');
  assert.equal((await summary.get()).data().completedSets,12);
  assert.equal((await handle(event)).action,'unchanged');
  assert.equal((await handle({...event,data:{...event.data,before:{data:()=>({status:'completed'})}}})).action,'ignored');
  assert.equal(messages.length,3);
 }finally{await deleteApp(app);}
});
