import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLocalAuditEndpoint} from '../v1-retirement-audit-local-endpoint.js';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('Firebase Auth emulator validates disabled and allowlisted admin before Firestore inventory',{skip:!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const app=initializeApp({projectId:'demo-nexor-fit-rules-test'},'audit-auth-emulator-test');
 try{
  const auth=getAuth(app),db=getFirestore(app);
  const admin=await auth.createUser({email:'audit-admin@example.test',emailVerified:true});
  const disabled=await auth.createUser({email:'audit-disabled@example.test',emailVerified:true,disabled:true});
  await db.doc('users/'+admin.uid+'/sessions/s1').set({id:'s1',status:'active',sets:[]});
  let scans=0;
  const trackedAuth={verifyIdToken:async()=>({uid:disabled.uid}),getUser:uid=>auth.getUser(uid),listUsers:async(...args)=>{scans++;return auth.listUsers(...args);}};
  const request={method:'POST',headers:{authorization:'Bearer emulator-token'}};
  const denied=response();await createLocalAuditEndpoint({adminAuth:trackedAuth,db,allowedUids:[disabled.uid]})(request,denied);
  assert.equal(denied.code,403);assert.equal(scans,0);
  trackedAuth.verifyIdToken=async()=>({uid:admin.uid});
  const ok=response();await createLocalAuditEndpoint({adminAuth:trackedAuth,db,allowedUids:[admin.uid]})(request,ok);
  assert.equal(ok.code,200);assert.equal(ok.body.counts.v1Active,1);
 }finally{await deleteApp(app);}
});
