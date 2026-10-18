import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuditEmulatorBundle} from '../functions/audit-emulator-bundle.js';
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('audit bundle cannot initialize outside emulators',()=>{
 const a=process.env.FIREBASE_AUTH_EMULATOR_HOST,b=process.env.FIRESTORE_EMULATOR_HOST;
 try{
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  assert.throws(()=>createAuditEmulatorBundle({}),/Emulators required/);
 }finally{
  if(a!==undefined)process.env.FIREBASE_AUTH_EMULATOR_HOST=a;
  if(b!==undefined)process.env.FIRESTORE_EMULATOR_HOST=b;
 }
});
test('audit bundle authorizes before generating and rejects identity fields',async()=>{
 const a=process.env.FIREBASE_AUTH_EMULATOR_HOST,b=process.env.FIRESTORE_EMULATOR_HOST;
 process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 try{
  let generated=0;
  const auth={verifyIdToken:async()=>({uid:'admin'}),getUser:async()=>({uid:'admin',emailVerified:true,disabled:false})};
  const generateReport=async()=>{generated++;return {uid:'private'};};
  const request={method:'POST',headers:{authorization:'Bearer test'}};
  const denied=response();
  await createAuditEmulatorBundle({adminAuth:auth,allowedUids:[],generateReport})(request,denied);
  assert.equal(denied.code,403);assert.equal(generated,0);
  const allowed=response();
  await createAuditEmulatorBundle({adminAuth:auth,allowedUids:['admin'],generateReport})(request,allowed);
  assert.equal(allowed.code,503);assert.equal(generated,1);
  assert.equal(JSON.stringify(allowed.body).includes('private'),false);
 }finally{
  if(a===undefined)delete process.env.FIREBASE_AUTH_EMULATOR_HOST;else process.env.FIREBASE_AUTH_EMULATOR_HOST=a;
  if(b===undefined)delete process.env.FIRESTORE_EMULATOR_HOST;else process.env.FIRESTORE_EMULATOR_HOST=b;
 }
});
