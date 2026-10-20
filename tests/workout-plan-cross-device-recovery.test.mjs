import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {encodeDynamicSession} from '../workout-plan-firestore-codec.js';
import {assessCrossDeviceWorkoutRecovery} from '../workout-plan-cross-device-recovery.js';
const plan={id:'p1',name:'Personalizado',origin:'manual',exercises:[
 {id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'}
]};
const active=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'r1',now:Date.parse('2026-10-01T10:00:00Z')});
const serverSession=encodeDynamicSession(active);
const base={uid:'u1',ownerUid:'u1',serverPointer:{sessionId:'s1'},serverSession};
const check=changes=>assessCrossDeviceWorkoutRecovery({...base,...changes});
test('recovers active server session without writing cached state',()=>{
 const result=check({});
 assert.equal(result.action,'resume-server-session');
 assert.deepEqual(result.progress,{completedSets:0,totalSets:3});
 assert.equal(result.localState,'different-or-missing');
});
test('blocks another account and completed sessions',()=>{
 assert.equal(check({uid:'u2'}).action,'blocked');
 assert.equal(check({serverSession:{...serverSession,status:'completed'}}).action,'blocked');
});
test('server pointer is authoritative when local device is stale',()=>{
 assert.equal(check({serverPointer:{sessionId:null},localSession:active}).action,'manual-review');
 assert.equal(check({serverPointer:{sessionId:null}}).action,'no-active-session');
 assert.equal(check({serverPointer:{sessionId:'s2'}}).action,'blocked');
});
test('local and server identity conflicts require review',()=>{
 assert.equal(check({localSession:{...active,requestId:'different'}}).action,'manual-review');
 assert.equal(check({localSession:{...active,planRevision:99}}).action,'manual-review');
 assert.equal(check({localSession:active}).localState,'compare-before-sync');
});
test('corrupt server session is not silently replaced by local copy',()=>{
 assert.equal(check({serverSession:{...serverSession,sets:[]},localSession:active}).action,'manual-review');
});
