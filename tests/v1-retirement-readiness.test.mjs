import test from 'node:test';
import assert from 'node:assert/strict';
import {assessV1Retirement} from '../v1-retirement-readiness.js';
test('V1 retirement is blocked when evidence is missing',()=>{
 const result=assessV1Retirement({inventoryComplete:true});
 assert.equal(result.ready,false);
 assert.ok(result.missing.includes('backupsVerified'));
 assert.ok(result.missing.includes('v2OfflineStrategyVerified'));
});
test('all explicit gates are required for readiness',()=>{
 const keys=assessV1Retirement({}).required;
 const complete=Object.fromEntries(keys.map(key=>[key,true]));
 assert.deepEqual(assessV1Retirement(complete).missing,[]);
 assert.equal(assessV1Retirement(complete).ready,true);
 for(const key of keys){assert.equal(assessV1Retirement({...complete,[key]:false}).ready,false);}
});
test('invalid checklist is rejected',()=>{
 assert.throws(()=>assessV1Retirement(null),/Checklist/);
 assert.throws(()=>assessV1Retirement([]),/Checklist/);
});
