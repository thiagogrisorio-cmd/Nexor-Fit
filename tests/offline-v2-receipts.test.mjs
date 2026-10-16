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
