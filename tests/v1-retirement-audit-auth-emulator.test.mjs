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
  const disabled=await auth.createUser({email:'audit-disabled@example.test',emailVerified:true});
  const unverified=await auth.createUser({email:'audit-unverified@example.test',emailVerified:false});
  const outsider=await auth.createUser({email:'audit-outsider@example.test',emailVerified:true});
  await db.doc('users/'+admin.uid+'/sessions/s1').set({id:'s1',status:'active',sets:[]});
  let scans=0;
  const trackedAuth={verifyIdToken:(token)=>auth.verifyIdToken(token,true),getUser:uid=>auth.getUser(uid),listUsers:async(...args)=>{scans++;return auth.listUsers(...args);}};
  const emulatorSignIn=async user=>{
   const custom=await auth.createCustomToken(user.uid);
   const endpoint='http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key';
   const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});
   if(!result.ok)throw Error('Emulator sign-in failed');
   return (await result.json()).idToken;
  };
  const disabledToken=await emulatorSignIn(disabled);
  const adminToken=await emulatorSignIn(admin);
  const unverifiedToken=await emulatorSignIn(unverified);
  const outsiderToken=await emulatorSignIn(outsider);
  await auth.updateUser(disabled.uid,{disabled:true});
  const request={method:'POST',headers:{authorization:'Bearer '+disabledToken}};
  const denied=response();await createLocalAuditEndpoint({adminAuth:trackedAuth,db,allowedUids:[disabled.uid]})(request,denied);
  assert.ok([401,403].includes(denied.code));assert.equal(scans,0);
  for(const [headers,allowlist,expected] of [
   [{},[admin.uid],401],
   [{authorization:'Bearer invalid-token'},[admin.uid],401],
   [{authorization:'Bearer '+unverifiedToken},[unverified.uid],403],
   [{authorization:'Bearer '+outsiderToken},[admin.uid],403]
  ]){
   const deniedCase=response();
   await createLocalAuditEndpoint({adminAuth:trackedAuth,db,allowedUids:allowlist})({method:'POST',headers},deniedCase);
   assert.equal(deniedCase.code,expected);
   assert.equal(scans,0,'Denied requests must not enumerate users');
  }
  request.headers.authorization='Bearer '+adminToken;
  const ok=response();await createLocalAuditEndpoint({adminAuth:trackedAuth,db,allowedUids:[admin.uid]})(request,ok);
  assert.equal(ok.code,200);assert.equal(ok.body.counts.v1Active,1);
 }finally{await deleteApp(app);}
});
