import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryUsers} from '../v1-retirement-inventory-users.js';
test('multi-user inventory returns aggregated totals without IDs',async()=>{
 const db={collection:path=>({orderBy:()=>({limit:()=>({get:async()=>({docs:path.includes('/first/')?[{id:'a',data:()=>({id:'a',status:'active'})}]:[{id:'b',data:()=>({id:'b',status:'completed',schemaVersion:2})}]})})})})};
 const report=await inventoryUsers({db,uids:['first','second']});
 assert.equal(report.usersScanned,2);
 assert.equal(report.counts.total,2);
 assert.equal(report.counts.v1Active,1);
 assert.equal(report.counts.v2Completed,1);
 assert.equal(report.complete,true);
 assert.equal(JSON.stringify(report).includes('first'),false);
});
test('rejects malformed user list',async()=>{
 await assert.rejects(inventoryUsers({db:{},uids:['other/user']}),/Lista/);
});
