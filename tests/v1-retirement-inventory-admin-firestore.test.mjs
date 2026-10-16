import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {inventoryUserSessions} from '../v1-retirement-inventory-admin.js';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
test('Admin inventory reads emulator sessions without modifying records',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'inventory-admin-test');
 try{
  const db=getFirestore(app),uid='inventory-admin-test';
  const rows=[{id:'a',status:'active'},{id:'b',status:'completed'},{id:'c',status:'active',schemaVersion:2},{id:'d',status:'completed',schemaVersion:2}];
  const batch=db.batch();
  for(const row of rows)batch.set(db.doc(`users/${uid}/sessions/${row.id}`),row);
  await batch.commit();
  const report=await inventoryUserSessions({db,uid,pageSize:2});
  assert.equal(report.complete,true);
  assert.equal(report.counts.total,4);
  assert.equal(report.counts.v1Active,1);
  assert.equal(report.counts.v2Completed,1);
  for(const row of rows){const saved=await db.doc(`users/${uid}/sessions/${row.id}`).get();assert.deepEqual(saved.data(),row);}
 }finally{await deleteApp(app);}
});
