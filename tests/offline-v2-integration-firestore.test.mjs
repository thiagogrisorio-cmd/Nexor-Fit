import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexedDB} from 'fake-indexeddb';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {startSession} from '../workout-session.js';
import {createV2Workout,updateV2Set} from '../session-v2-repository.js';
import {queueV2SetEdit,listPendingV2Edits,syncPendingV2Edits} from '../offline-v2-queue.js';

globalThis.indexedDB=indexedDB;
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-v2-offline-integration',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
test('V2 offline IndexedDB edit replays through real Firestore emulator transaction',async()=>{
 const uid='offline-v2-integration',sessionId='offline-v2-integration-session';
 const db=env.authenticatedContext(uid).firestore();
 await createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid,id:'first',sessionId,exerciseIndex:0,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1000});
 assert.equal((await listPendingV2Edits(uid)).length,1);
 const readRemoteExercise=async op=>(await getDoc(doc(db,'users',uid,'sessions',op.sessionId,'exercises',String(op.exerciseIndex)))).data();
 const updateRemoteSet=async op=>updateV2Set({db,uid,sessionId:op.sessionId,exerciseIndex:op.exerciseIndex,setIndex:op.setIndex,done:op.done,expectedRevision:op.expectedRevision,expectedCompletedAt:op.expectedCompletedAt,now:op.at,runTransaction,doc,serverTimestamp});
 const result=await syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet});
 assert.equal(result[0].status,'synced');
 assert.equal((await listPendingV2Edits(uid)).length,0);
 const saved=await readRemoteExercise({sessionId,exerciseIndex:0});
 assert.equal(saved.revision,1);
 assert.equal(saved.sets[0].done,true);
});
test('V2 offline queue rejects replay for another authenticated user',async()=>{
 const owner='offline-v2-owner',sessionId='offline-v2-private';
 const db=env.authenticatedContext(owner).firestore();
 await createV2Workout({db,uid:owner,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 const other=env.authenticatedContext('offline-v2-intruder').firestore();
 await assert.rejects(getDoc(doc(other,'users',owner,'sessions',sessionId,'exercises','0')));
});

test('V2 offline queue replays two different sets in one exercise and clears IndexedDB',async()=>{
 const uid='offline-v2-rebase',sessionId='offline-v2-rebase-session';
 const db=env.authenticatedContext(uid).firestore();
 await createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid,id:'set-a',sessionId,exerciseIndex:1,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1000});
 await queueV2SetEdit({uid,id:'set-b',sessionId,exerciseIndex:1,setIndex:1,done:true,baseRevision:0,baseCompletedAt:null,at:1001});
 const readRemoteExercise=async op=>(await getDoc(doc(db,'users',uid,'sessions',op.sessionId,'exercises',String(op.exerciseIndex)))).data();
 const updateRemoteSet=async op=>updateV2Set({db,uid,sessionId:op.sessionId,exerciseIndex:op.exerciseIndex,setIndex:op.setIndex,done:op.done,expectedRevision:op.expectedRevision,expectedCompletedAt:op.expectedCompletedAt,now:op.at,runTransaction,doc,serverTimestamp});
 const result=await syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet});
 assert.equal(result[0].status,'synced');
 assert.equal(result[0].processed,2);
 assert.equal((await listPendingV2Edits(uid)).length,0);
 const saved=await readRemoteExercise({sessionId,exerciseIndex:1});
 assert.equal(saved.revision,2);
 assert.deepEqual(saved.sets.map(s=>s.done),[true,true]);
});

test('V2 interruption after first commit preserves remaining IndexedDB edit',async()=>{
 const uid='offline-v2-interrupted',sessionId='offline-v2-interrupted-session';
 const db=env.authenticatedContext(uid).firestore();
 await createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid,id:'first',sessionId,exerciseIndex:2,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:1000});
 await queueV2SetEdit({uid,id:'second',sessionId,exerciseIndex:2,setIndex:1,done:true,baseRevision:0,baseCompletedAt:null,at:1001});
 const readRemoteExercise=async op=>(await getDoc(doc(db,'users',uid,'sessions',op.sessionId,'exercises',String(op.exerciseIndex)))).data();
 let calls=0;
 const updateRemoteSet=async op=>{
  calls++;
  if(calls===2)throw Error('network disconnected');
  return updateV2Set({db,uid,sessionId:op.sessionId,exerciseIndex:op.exerciseIndex,setIndex:op.setIndex,done:op.done,expectedRevision:op.expectedRevision,expectedCompletedAt:op.expectedCompletedAt,now:op.at,runTransaction,doc,serverTimestamp});
 };
 await assert.rejects(syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet}),/network disconnected/);
 const pending=await listPendingV2Edits(uid);
 assert.equal(pending.length,1);
 assert.equal(pending[0].setIndex,1);
 const remote=await readRemoteExercise({sessionId,exerciseIndex:2});
 assert.equal(remote.revision,1);
 assert.deepEqual(remote.sets.map(s=>s.done),[true,false]);
 const retry=await syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet:async op=>
  updateV2Set({db,uid,sessionId:op.sessionId,exerciseIndex:op.exerciseIndex,setIndex:op.setIndex,done:op.done,expectedRevision:op.expectedRevision,expectedCompletedAt:op.expectedCompletedAt,now:op.at,runTransaction,doc,serverTimestamp})});
 assert.equal(retry[0].status,'conflict');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});

test('V2 recovery diagnosis reads emulator state without removing pending edit',async()=>{
 const {inspectV2RecoveryQueue}=await import('../offline-v2-recovery-queue.js');
 const uid='recovery-emulator',sessionId='recovery-emulator-session';
 const db=env.authenticatedContext(uid).firestore();
 await createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid,id:'recovery',sessionId,exerciseIndex:4,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:100});
 const readRemoteExercise=async op=>(await getDoc(doc(db,'users',uid,'sessions',op.sessionId,'exercises',String(op.exerciseIndex)))).data();
 const report=await inspectV2RecoveryQueue({uid,readRemoteExercise});
 assert.equal(report.total,1);
 assert.equal(report.results[0].status,'safe-to-retry');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});

test('V2 recovery diagnosis detects changed remote revision and preserves local edit',async()=>{
 const {inspectV2RecoveryQueue}=await import('../offline-v2-recovery-queue.js');
 const uid='recovery-conflict',sessionId='recovery-conflict-session';
 const db=env.authenticatedContext(uid).firestore();
 await createV2Workout({db,uid,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid,id:'conflict',sessionId,exerciseIndex:5,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:100});
 await updateV2Set({db,uid,sessionId,exerciseIndex:5,setIndex:0,done:true,expectedRevision:0,expectedCompletedAt:null,now:101,runTransaction,doc,serverTimestamp});
 const readRemoteExercise=async op=>(await getDoc(doc(db,'users',uid,'sessions',op.sessionId,'exercises',String(op.exerciseIndex)))).data();
 const report=await inspectV2RecoveryQueue({uid,readRemoteExercise});
 assert.equal(report.results[0].status,'manual-review');
 assert.equal((await listPendingV2Edits(uid)).length,1);
});

test('V2 recovery diagnosis isolates pending operations by authenticated user',async()=>{
 const {inspectV2RecoveryQueue}=await import('../offline-v2-recovery-queue.js');
 const owner='recovery-account-owner',other='recovery-account-other',sessionId='recovery-account-session';
 const db=env.authenticatedContext(owner).firestore();
 await createV2Workout({db,uid:owner,session:startSession({id:sessionId,day:0,now:0}),runTransaction,doc,serverTimestamp});
 await queueV2SetEdit({uid:owner,id:'private',sessionId,exerciseIndex:6,setIndex:0,done:true,baseRevision:0,baseCompletedAt:null,at:100});
 const report=await inspectV2RecoveryQueue({uid:other,readRemoteExercise:async()=>{throw Error('cross-account read');}});
 assert.equal(report.total,0);
 assert.equal((await listPendingV2Edits(owner)).length,1);
});
