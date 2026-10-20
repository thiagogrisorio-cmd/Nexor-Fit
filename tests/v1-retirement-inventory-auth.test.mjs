import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryAuthUsers} from '../v1-retirement-inventory-auth.js';
const db={collection:path=>({orderBy:()=>({limit:()=>({get:async()=>({docs:[{id:'session',data:()=>({id:'session',status:'active',schemaVersion:path.includes('second')?2:undefined})}]})})})})};
test('discovers Auth pages and returns aggregate inventory',async()=>{
 const auth={listUsers:async(_size,token)=>token?{users:[{uid:'second'}]}:{users:[{uid:'first'}],pageToken:'next'}};
 const report=await inventoryAuthUsers({auth,db,batchSize:1});
 assert.equal(report.complete,true);
 assert.equal(report.usersScanned,2);
 assert.equal(report.counts.v1Active,1);
 assert.equal(report.counts.v2Active,1);
 assert.equal(JSON.stringify(report).includes('first'),false);
});
test('stops at configured Auth page limit without claiming completion',async()=>{
 const auth={listUsers:async()=>({users:[{uid:'first'}],pageToken:'next'})};
 const report=await inventoryAuthUsers({auth,db,maxBatches:1});
 assert.equal(report.complete,false);
});
test('rejects repeated UID across pages',async()=>{
 const auth={listUsers:async(_size,token)=>token?{users:[{uid:'first'}]}:{users:[{uid:'first'}],pageToken:'next'}};
 await assert.rejects(inventoryAuthUsers({auth,db}),/repetido/);
});
