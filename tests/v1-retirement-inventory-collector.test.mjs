import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSessionInventory} from '../v1-retirement-inventory-collector.js';
test('aggregates two pages without including document identifiers',async()=>{
 const report=await collectSessionInventory({listPage:async({cursor})=>cursor?{rows:[{id:'b',data:{id:'b',status:'completed',schemaVersion:2}}],nextCursor:null}:{rows:[{id:'a',data:{id:'a',status:'active'}}],nextCursor:'next'}});
 assert.equal(report.counts.total,2);
 assert.equal(report.counts.v1Active,1);
 assert.equal(report.counts.v2Completed,1);
 assert.equal(report.complete,true);
 assert.equal(JSON.stringify(report).includes('next'),false);
});
test('partial pagination cannot claim completeness',async()=>{
 const report=await collectSessionInventory({maxPages:1,listPage:async()=>({rows:[],nextCursor:'next'})});
 assert.equal(report.complete,false);
});
test('rejects looping cursors',async()=>{
 await assert.rejects(collectSessionInventory({maxPages:3,listPage:async()=>({rows:[],nextCursor:'loop'})}),/Cursor/);
});
