import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeAuditReport} from '../v1-retirement-audit-access.js';
const actor={uid:'admin',emailVerified:true,disabled:false};
test('permits only explicitly allowed verified emulator administrator',()=>{
 assert.deepEqual(authorizeAuditReport({actor,allowedUids:['admin'],environment:'emulator'}),{authorized:true,readOnly:true,environment:'emulator'});
});
test('fails closed on production, unverified identity and missing allowlist',()=>{
 assert.throws(()=>authorizeAuditReport({actor,allowedUids:['admin'],environment:'production'}),/Ambiente/);
 assert.throws(()=>authorizeAuditReport({actor:{...actor,emailVerified:false},allowedUids:['admin'],environment:'emulator'}),/Acesso/);
 assert.throws(()=>authorizeAuditReport({actor,allowedUids:[],environment:'emulator'}),/Acesso/);
});
