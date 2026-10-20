import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLocalAuditEndpoint} from '../v1-retirement-audit-local-endpoint.js';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('authorized aggregate report reads Firestore emulator; unauthorized request never scans',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'local-audit-emulator-test');
 try{
  const db=getFirestore(app);
  await db.doc('users/audit-member/sessions/audit-v1').set({id:'audit-v1',status:'active',sets:[]});
  let listings=0;
  const auth={
   verifyIdToken:async()=>({uid:'audit-admin'}),
   getUser:async uid=>({uid,emailVerified:true,disabled:false}),
   listUsers:async()=>{listings++;return {users:[{uid:'audit-member'}]};}
  };
  const request={method:'POST',headers:{authorization:'Bearer emulator-test-token'}};
  const denied=response();
  await createLocalAuditEndpoint({adminAuth:auth,db,allowedUids:['another-admin']})(request,denied);
  assert.equal(denied.code,403);
  assert.equal(listings,0);
  const allowed=response();
  await createLocalAuditEndpoint({adminAuth:auth,db,allowedUids:['audit-admin']})(request,allowed);
  assert.equal(allowed.code,200);
  assert.equal(allowed.body.counts.v1Active,1);
  assert.equal(allowed.body.readyForReview,false);
  assert.ok(allowed.body.blockers.includes('v1-active-sessions'));
  assert.equal(allowed.body.readOnly,true);
  assert.equal(JSON.stringify(allowed.body).includes('audit-member'),false);
 }finally{await deleteApp(app);}
});

test('aggregate report rejects V1 active sessions and never leaks document IDs', {skip:!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'audit-risk-report-emulator-test');
 try{
  const db=getFirestore(app);
  const uid='audit-risk-member',sessionId='audit-risk-session';
  await db.doc(`users/${uid}/sessions/${sessionId}`).set({id:sessionId,status:'active',sets:[]});
  let scanned=0;
  const auth={verifyIdToken:async()=>({uid:'audit-risk-admin'}),getUser:async id=>({uid:id,emailVerified:true,disabled:false}),listUsers:async()=>{scanned++;return {users:[{uid}]};}};
  const result=response();
  await createLocalAuditEndpoint({adminAuth:auth,db,allowedUids:['audit-risk-admin']})({method:'POST',headers:{authorization:'Bearer emulator-only'}},result);
  assert.equal(result.code,200);
  assert.equal(result.body.readOnly,true);
  assert.equal(result.body.readyForReview,false);
  assert.ok(result.body.counts.v1Active>=1);
  assert.ok(result.body.blockers.includes('v1-active-sessions'));
  assert.equal(JSON.stringify(result.body).includes(uid),false);
  assert.equal(JSON.stringify(result.body).includes(sessionId),false);
  assert.equal(scanned,1);
 }finally{await deleteApp(app);}
});
