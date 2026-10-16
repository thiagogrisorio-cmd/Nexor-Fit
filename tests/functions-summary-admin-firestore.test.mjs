import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {executeV2Summary} from '../functions/session-v2-summary-executor.js';
const emulator=process.env.FIRESTORE_EMULATOR_HOST;
test('Admin emulator: V2 summary is created once and conflict is rejected',{skip:!emulator},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'summary-admin-test');
 try{
  const db=getFirestore(app);
  const uid='summary-admin-test',sid='complete-v2';
  const parent=db.doc(`users/${uid}/sessions/${sid}`);
  const summary=db.doc(`users/${uid}/sessionSummaries/${sid}`);
  const batch=db.batch();
  batch.set(parent,{id:sid,schemaVersion:2,status:'completed',day:0,endedAt:'2026-10-16T10:00:00.000Z',durationSeconds:90});
  for(let i=0;i<12;i++)batch.set(db.doc(`users/${uid}/sessions/${sid}/exercises/${i}`),{index:i,sessionId:sid,sets:[{done:true,completedAt:null},{done:false,completedAt:null}]});
  await batch.commit();
  assert.equal((await executeV2Summary({store:db,uid,sessionId:sid})).action,'create');
  assert.equal((await executeV2Summary({store:db,uid,sessionId:sid})).action,'unchanged');
  assert.equal((await summary.get()).data().completedSets,12);
  await summary.update({completedSets:24});
  await assert.rejects(executeV2Summary({store:db,uid,sessionId:sid}),/Conflito/);
  assert.equal((await summary.get()).data().completedSets,24);
 }finally{await deleteApp(app);}
});
