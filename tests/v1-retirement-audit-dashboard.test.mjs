import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDashboardModel} from '../v1-retirement-audit-dashboard.js';
const counts={total:2,v1Active:1,v1Completed:0,v2Active:0,v2Completed:1,unknown:0};
test('dashboard shows blockers and aggregate metrics',()=>{
 const model=auditDashboardModel({counts,blockers:['v1-active-sessions'],orphanAudit:{orphanOwners:0},complete:true,readyForReview:false,readOnly:true});
 assert.equal(model.metrics[0].value,2);
 assert.equal(model.reviewOnly,false);
 assert.equal(model.blockers[0].label,'Existem sessões V1 ativas');
});
test('dashboard refuses unknown blockers and untrusted reports',()=>{
 const base={counts,blockers:[],orphanAudit:{orphanOwners:0},complete:true,readyForReview:true,readOnly:true};
 assert.throws(()=>auditDashboardModel({...base,readOnly:false}),/inválido/);
 assert.throws(()=>auditDashboardModel({...base,blockers:['unexpected']}),/desconhecido/);
 assert.equal(auditDashboardModel(base).reviewOnly,true);
});
