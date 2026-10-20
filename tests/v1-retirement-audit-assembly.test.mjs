import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleRetirementAudit} from '../v1-retirement-audit-assembly.js';
test('assembles aggregate read-only audit from empty paginated sources',async()=>{
 const auth={listUsers:async()=>({users:[]}),getUser:async()=>({uid:'a'})};
 const db={collectionGroup:()=>({orderBy:()=>({limit:()=>({get:async()=>({docs:[]})})})})};
 const report=await assembleRetirementAudit(auth,db);
 assert.equal(report.counts.total,0);
 assert.equal(report.readOnly,true);
 assert.equal(report.complete,true);
 assert.equal(report.readyForReview,true);
});
