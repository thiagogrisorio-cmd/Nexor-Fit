import test from 'node:test';
import assert from 'node:assert/strict';
import {buildV1RetirementAuditReport} from '../v1-retirement-audit-report.js';
const counts={total:3,v1Active:1,v1Completed:1,v2Active:0,v2Completed:1,unknown:0};
const orphans={ownersScanned:2,orphanOwners:1,sessionDocuments:3,complete:true};
test('audit report blocks active V1 sessions and orphan owners',()=>{
 const report=buildV1RetirementAuditReport({inventory:{counts,complete:true},orphans});
 assert.equal(report.readyForReview,false);
 assert.deepEqual(report.blockers,['v1-active-sessions','orphan-session-owners']);
 assert.equal(JSON.stringify(report).includes('uid'),false);
});
test('partial scans cannot pass review',()=>{
 const report=buildV1RetirementAuditReport({inventory:{counts:{total:0,v1Active:0,v1Completed:0,v2Active:0,v2Completed:0,unknown:0},complete:false},orphans:{ownersScanned:0,orphanOwners:0,sessionDocuments:0,complete:true}});
 assert.equal(report.readyForReview,false);
 assert.equal(report.complete,false);
});
test('rejects inconsistent counts',()=>{
 assert.throws(()=>buildV1RetirementAuditReport({inventory:{counts:{...counts,total:99},complete:true},orphans}),/inconsistente/);
});

test('rejects more examined owners than session documents',()=>{
 assert.throws(()=>buildV1RetirementAuditReport({inventory:{counts,complete:true},orphans:{...orphans,ownersScanned:4}}),/Órfãos inconsistentes/);
 assert.throws(()=>buildV1RetirementAuditReport({inventory:{counts,complete:true},orphans:{...orphans,orphanOwners:3}}),/Órfãos inconsistentes/);
});
