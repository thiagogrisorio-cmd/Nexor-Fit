import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtectedAuditEndpoint} from '../functions/audit-report-protected-endpoint.js';
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('protected endpoint only runs report for verified allowlisted user',async()=>{
 let reads=0;
 const adminAuth={verifyIdToken:async()=>({uid:'a'}),getUser:async()=>({uid:'a',emailVerified:true,disabled:false})};
 const endpoint=createProtectedAuditEndpoint({adminAuth,allowedUids:['a'],generateReport:async()=>{reads++;return {readOnly:true,complete:false};}});
 const ok=response();await endpoint({method:'POST',headers:{authorization:'Bearer test'}},ok);
 assert.equal(ok.code,200);assert.equal(reads,1);
 const denied=createProtectedAuditEndpoint({adminAuth,allowedUids:['b'],generateReport:async()=>{reads++;}});
 const no=response();await denied({method:'POST',headers:{authorization:'Bearer test'}},no);
 assert.equal(no.code,403);assert.equal(reads,1);
});
