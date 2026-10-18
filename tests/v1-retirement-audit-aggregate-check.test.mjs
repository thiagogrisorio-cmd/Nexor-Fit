import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAggregateReport} from '../functions/audit-aggregate-check.js';
test('rejects reports without read-only aggregate contract',()=>{
 assert.throws(()=>assertAggregateReport({readOnly:false,counts:{},blockers:[]}),/Invalid/);
 assert.throws(()=>assertAggregateReport({readOnly:true,counts:{}}),/Invalid/);
 assert.equal(assertAggregateReport({readOnly:true,counts:{total:0},blockers:[]}).readOnly,true);
});
