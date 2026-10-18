import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmulatorAuditService} from '../functions/audit-report-emulator-service.js';
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('verifies token, loads current user and returns report only to allowlisted admin',async()=>{
 let calls=0;
 const adminAuth={verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=='valid')throw Error('invalid');return {uid:'admin'};},getUser:async()=>({uid:'admin',emailVerified:true,disabled:false})};
 const handler=createEmulatorAuditService({adminAuth,allowedUids:['admin'],buildReport:async()=>{calls++;return {readOnly:true,counts:{total:0}};}});
 const ok=response();await handler({method:'POST',headers:{authorization:'Bearer valid'}},ok);
 assert.equal(ok.code,200);assert.equal(calls,1);
 const denied=response();await handler({method:'POST',headers:{authorization:'Bearer invalid'}},denied);
 assert.equal(denied.code,401);assert.equal(calls,1);
});
test('disabled user cannot generate reports',async()=>{
 let calls=0;
 const adminAuth={verifyIdToken:async()=>({uid:'admin'}),getUser:async()=>({uid:'admin',emailVerified:true,disabled:true})};
 const handler=createEmulatorAuditService({adminAuth,allowedUids:['admin'],buildReport:async()=>{calls++;}});
 const denied=response();await handler({method:'POST',headers:{authorization:'Bearer token'}},denied);
 assert.equal(denied.code,403);assert.equal(calls,0);
});
