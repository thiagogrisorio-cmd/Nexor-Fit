import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryUserSessions} from '../v1-retirement-inventory-admin.js';
test('Admin inventory reads ordered pages and returns aggregate counts',async()=>{
 const docs=[{id:'a',data:()=>({id:'a',status:'active'})},{id:'b',data:()=>({id:'b',status:'completed',schemaVersion:2})},{id:'c',data:()=>({id:'c',status:'completed'})}];
 const calls=[];
 const db={collection:path=>{assert.equal(path,'users/test-user/sessions');return {orderBy:field=>{assert.equal(field,'__name__');return {limit:size=>({startAfter:cursor=>({get:async()=>{calls.push(cursor);return {docs:docs.filter(d=>d.id>cursor).slice(0,size)};}}),get:async()=>{calls.push(null);return {docs:docs.slice(0,size)};}})};}};}};
 const report=await inventoryUserSessions({db,uid:'test-user',pageSize:2});
 assert.equal(report.counts.total,3);
 assert.equal(report.counts.v1Active,1);
 assert.equal(report.counts.v1Completed,1);
 assert.equal(report.counts.v2Completed,1);
 assert.equal(report.complete,true);
 assert.deepEqual(calls,[null,'b']);
});
test('Admin inventory rejects invalid user path',async()=>{
 await assert.rejects(inventoryUserSessions({db:{collection:()=>{}},uid:'other/user'}),/Parâmetros/);
});
