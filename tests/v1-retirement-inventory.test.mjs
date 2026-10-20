import test from 'node:test';
import assert from 'node:assert/strict';
import {inventorySessionRows} from '../v1-retirement-inventory.js';
test('classifies active and completed V1/V2 sessions without modifying them',()=>{
 const rows=[{id:'a',data:{id:'a',status:'active'}},{id:'b',data:{id:'b',status:'completed'}},{id:'c',data:{id:'c',status:'active',schemaVersion:2}},{id:'d',data:{id:'d',status:'completed',schemaVersion:2}}];
 assert.deepEqual(inventorySessionRows(rows),{counts:{total:4,v1Active:1,v1Completed:1,v2Active:1,v2Completed:1,unknown:0},issues:[]});
});
test('flags unsupported records and ID mismatch for manual review',()=>{
 const report=inventorySessionRows([{id:'x',data:{id:'y',status:'active'}},{id:'z',data:{id:'z',status:'paused',schemaVersion:3}}]);
 assert.equal(report.counts.unknown,1);
 assert.deepEqual(report.issues,[{id:'x',reason:'id-mismatch'},{id:'z',reason:'unsupported-schema-or-status'}]);
});
test('rejects malformed input',()=>{
 assert.throws(()=>inventorySessionRows(null),/Inventário/);
 assert.throws(()=>inventorySessionRows([{id:'x'}]),/Linha/);
});
