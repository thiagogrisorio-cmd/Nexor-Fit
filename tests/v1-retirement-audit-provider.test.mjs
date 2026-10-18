import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAuditProvider} from '../functions/audit-provider.js';
import {createProtectedAuditEndpoint} from '../functions/audit-report-protected-endpoint.js';
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('protected endpoint calls aggregate provider only after authorization',async()=>{
 let scans=0;
 const provider=makeAuditProvider({scanSessions:async()=>{scans++;return {counts:{total:0}};},scanOwners:async()=>{scans++;return {orphanOwners:0};},combine:()=>({readOnly:true,counts:{total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0},orphanAudit:{ownersScanned:0,orphanOwners:0,sessionDocuments:0},complete:true,readyForReview:true,blockers:[]})});
 const auth={verifyIdToken:async()=>({uid:'a'}),getUser:async()=>({uid:'a',emailVerified:true,disabled:false})};
 const handler=createProtectedAuditEndpoint({adminAuth:auth,allowedUids:['b'],generateReport:provider});
 const denied=response();await handler({method:'POST',headers:{authorization:'Bearer token'}},denied);
 assert.equal(denied.code,403);assert.equal(scans,0);
 const allowed=createProtectedAuditEndpoint({adminAuth:auth,allowedUids:['a'],generateReport:provider});
 const ok=response();await allowed({method:'POST',headers:{authorization:'Bearer token'}},ok);
 assert.equal(ok.code,200);assert.equal(scans,2);assert.equal(ok.body.readOnly,true);
});
