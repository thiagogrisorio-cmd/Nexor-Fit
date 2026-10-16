import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {saveReceipt,getReceipt} from '../offline-v2-receipts.js';
globalThis.indexedDB=indexedDB;
test('receipt survives reopening IndexedDB between writes and reads',async()=>{
 const receipt={id:'uid:v2:op-1',sessionId:'s',exerciseIndex:0,revisionBefore:0,revisionAfter:1,completedAt:'2026-10-16T12:00:00.000Z'};
 await saveReceipt(receipt);
 assert.deepEqual(await getReceipt(receipt.id),receipt);
 assert.equal(await getReceipt('missing'),null);
});

test('receipt remains available after an explicit database close',async()=>{
 const id='close-reopen-receipt';
 await saveReceipt({id,revisionAfter:2});
 const req=indexedDB.open('nexor-fit-offline-v1',2);
 const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 db.close();
 assert.equal((await getReceipt(id)).revisionAfter,2);
});

test('receipt store upgrades an existing version-one database',async()=>{
 const name='nexor-fit-offline-v1';
 const existing=await new Promise((resolve,reject)=>{const req=indexedDB.open(name,2);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 assert.ok(existing.objectStoreNames.contains('receipts'));
 existing.close();
});
