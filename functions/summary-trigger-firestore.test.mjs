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

// The handler test above simulates an event. The following check observes an actual Functions emulator trigger.
test('Functions emulator: Firestore update emits completion event and persists summary',{skip:!emulator||!process.env.FUNCTIONS_EMULATOR},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'summary-live-trigger-test');
 try{
  const db=getFirestore(app),uid='summary-live-trigger-test',sessionId='live-completion';
  const parent=db.doc(`users/${uid}/sessions/${sessionId}`),summary=db.doc(`users/${uid}/sessionSummaries/${sessionId}`);
  const batch=db.batch();
  batch.set(parent,{id:sessionId,schemaVersion:2,status:'active',day:0,startedAt:'2026-10-16T10:00:00.000Z'});
  for(let i=0;i<12;i++)batch.set(db.doc(`users/${uid}/sessions/${sessionId}/exercises/${i}`),{index:i,sessionId,sets:[{done:true,completedAt:null},{done:false,completedAt:null}]});
  await batch.commit();
  // A normal metadata update while active must not create a completion summary.
  await parent.update({durationSeconds:30});
  // Allow asynchronous Firestore events to run before checking for unwanted side effects.
  await new Promise(resolve=>setTimeout(resolve,1500));
  const premature=await summary.get();
  assert.equal(premature.exists,false,'Active session update must not create a summary');
  await parent.update({status:'completed',endedAt:'2026-10-16T10:05:00.000Z',durationSeconds:300});
  let result=null;
  for(let attempt=0;attempt<30;attempt++){
   const snapshot=await summary.get();
   if(snapshot.exists){result=snapshot.data();break;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(result,'Firestore completion must trigger a persisted summary within 30 seconds');
  assert.equal(result.completedSets,12);
  assert.equal(result.totalSets,24);
 }finally{await deleteApp(app);}
});
