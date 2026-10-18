import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAuditEndpoint} from '../v1-retirement-audit-local-endpoint.js';
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}}finally{
 if(oldAuth===undefined)delete process.env.FIREBASE_AUTH_EMULATOR_HOST;else process.env.FIREBASE_AUTH_EMULATOR_HOST=oldAuth;
 if(oldStore===undefined)delete process.env.FIRESTORE_EMULATOR_HOST;else process.env.FIRESTORE_EMULATOR_HOST=oldStore;
 }
});
test('protected local endpoint prevents scans before authorization and returns aggregate report',async()=>{
 const oldAuth=process.env.FIREBASE_AUTH_EMULATOR_HOST,oldStore=process.env.FIRESTORE_EMULATOR_HOST;
 process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 try{
 let scans=0;
 const auth={verifyIdToken:async()=>({uid:'admin'}),getUser:async()=>({uid:'admin',emailVerified:true,disabled:false}),listUsers:async()=>{scans++;return {users:[]};}};
 const db={collectionGroup:()=>{scans++;return {orderBy(){return this;},limit(){return this;},get:async()=>({docs:[]})};}};
 const request={method:'POST',headers:{authorization:'Bearer fake'}};
 const denied=response();await createLocalAuditEndpoint({adminAuth:auth,db,allowedUids:['other']})(request,denied);
 assert.equal(denied.code,403);assert.equal(scans,0);
 const allowed=response();await createLocalAuditEndpoint({adminAuth:auth,db,allowedUids:['admin']})(request,allowed);
 assert.equal(allowed.code,200);assert.equal(scans,2);assert.equal(allowed.body.readOnly,true);
 assert.deepEqual(allowed.body.counts,{total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0});
});
