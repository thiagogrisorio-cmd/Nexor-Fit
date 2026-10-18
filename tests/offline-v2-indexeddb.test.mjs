import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
globalThis.indexedDB=indexedDB;
globalThis.IDBKeyRange=IDBKeyRange;
const {queueV2SetEdit,listPendingV2Edits,syncPendingV2Edits}=await import('../offline-v2-queue.js');
const {listOfflineOperations}=await import('../offline-store.js');

test('IndexedDB preserves pending V2 edit across module reload',async()=>{
 const uid='restart-test-user';
 await queueV2SetEdit({uid,id:'op-restart',sessionId:'session-restart',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1});
 const before=await listPendingV2Edits(uid);
 assert.equal(before.length,1);
 // New module instance simulates reload of the queue adapter while database remains durable.
 const reloaded=await import('../offline-v2-queue.js?reload=restart');
 const after=await reloaded.listPendingV2Edits(uid);
 assert.equal(after.length,1);
 assert.equal(after[0].id,before[0].id);
});
test('IndexedDB removes V2 operation only after successful sync',async()=>{
 const uid='ack-test-user';
 await queueV2SetEdit({uid,id:'op-ack',sessionId:'session-ack',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:2});
 const remote=()=>({index:0,sessionId:'session-ack',revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]});
 await assert.rejects(syncPendingV2Edits({uid,readRemoteExercise:async()=>remote(),updateRemoteSet:async()=>{throw Error('connection lost');}}),/connection lost/);
 assert.equal((await listPendingV2Edits(uid)).length,1);
 let server=remote();
 const results=await syncPendingV2Edits({uid,readRemoteExercise:async()=>structuredClone(server),updateRemoteSet:async()=>{server={...server,revision:1,sets:[{done:true,completedAt:'2026-10-18T12:00:00.000Z'},server.sets[1]]};}});
 assert.equal(results[0].status,'synced');
 assert.equal((await listPendingV2Edits(uid)).length,0);
});
test('IndexedDB isolates pending V2 operations by account',async()=>{
 assert.equal((await listPendingV2Edits('other-user')).length,0);
 assert.ok((await listOfflineOperations()).every(op=>op.kind==='v2-mark-set'));
});

test('V2 queue survives account switch between remote confirmation and acknowledgement',async()=>{
 const uid='switch-test-user';
 await queueV2SetEdit({uid,id:'op-switch',sessionId:'session-switch',exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:3});
 let current=true,server={index:0,sessionId:'session-switch',revision:0,sets:[{done:false,completedAt:null},{done:false,completedAt:null}]};
 await assert.rejects(syncPendingV2Edits({uid,canAcknowledge:()=>current,
  readRemoteExercise:async()=>structuredClone(server),
  updateRemoteSet:async()=>{server={...server,revision:1,sets:[{done:true,completedAt:'2026-10-18T12:00:00.000Z'},server.sets[1]]};current=false;}
 }),/conta ou conexão alterada/);
 assert.equal((await listPendingV2Edits(uid)).length,1);
});
