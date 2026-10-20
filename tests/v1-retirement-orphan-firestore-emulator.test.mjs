import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {auditFirestoreSessionOrphans} from '../v1-retirement-orphan-firestore.js';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
test('orphan audit paginates real Firestore emulator queries',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'orphan-audit-test');
 try{
  const db=getFirestore(app);
  const rows=['users/a/sessions/s1','users/a/sessions/s2','users/b/sessions/s3'];
  const batch=db.batch();for(const path of rows)batch.set(db.doc(path),{status:'active'});await batch.commit();
  const auth={getUser:async uid=>{if(uid==='b')throw Object.assign(new Error('missing'),{code:'auth/user-not-found'});return {uid};}};
  const report=await auditFirestoreSessionOrphans({db,auth,pageSize:2});
  assert.equal(report.complete,true);
  assert.equal(report.orphanOwners,1);
  assert.ok(report.sessionDocuments>=3);
 }finally{await deleteApp(app);}
});
