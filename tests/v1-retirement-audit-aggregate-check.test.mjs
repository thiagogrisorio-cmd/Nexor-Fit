import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAggregateReport} from '../functions/audit-aggregate-check.js';
const valid=()=>({readOnly:true,counts:{total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0},orphanAudit:{ownersScanned:0,orphanOwners:0,sessionDocuments:0},complete:true,readyForReview:true,blockers:[]});
test('accepts exact aggregated report',()=>assert.equal(assertAggregateReport(valid()).readOnly,true));
test('rejects extra fields and personally identifying data',()=>{
 assert.throws(()=>assertAggregateReport({...valid(),uid:'private'}),/Invalid/);
 assert.throws(()=>assertAggregateReport({...valid(),counts:{...valid().counts,email:'private'}}),/Invalid/);
 assert.throws(()=>assertAggregateReport({...valid(),orphanAudit:{...valid().orphanAudit,userIds:['private']}}),/Invalid/);
});
test('rejects inconsistent totals, invalid blockers and false readiness',()=>{
 assert.throws(()=>assertAggregateReport({...valid(),counts:{...valid().counts,total:1}}),/Invalid/);
 assert.throws(()=>assertAggregateReport({...valid(),blockers:['unknown']}),/Invalid/);
 assert.throws(()=>assertAggregateReport({...valid(),complete:false}),/Invalid/);
});
