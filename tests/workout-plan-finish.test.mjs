import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
import {encodeDynamicSession} from '../workout-plan-firestore-codec.js';
import {planDynamicSessionFinish} from '../workout-plan-finish.js';
import {finishDynamicWorkoutSession} from '../workout-plan-repository.js';
const plan={id:'p',name:'Treino livre',origin:'manual',exercises:[{id:'e',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'}]};
const session=encodeDynamicSession(prepareWorkoutFromPlan({plan,sessionId:'s',requestId:'r',now:1000}));
const endedAt='1970-01-01T00:02:00.000Z';
const base={sessionId:'s',sessionDocument:session,activePointer:{sessionId:'s'},endedAt};
test('finish calculates duration and preserves prescription',()=>{
 const result=planDynamicSessionFinish(base);
 assert.equal(result.action,'finish');
 assert.equal(result.durationSeconds,119);
 assert.equal(session.status,'active');
});
test('finish blocks wrong pointer, invalid data and backward time',()=>{
 assert.equal(planDynamicSessionFinish({...base,activePointer:{sessionId:'other'}}).action,'conflict');
 assert.equal(planDynamicSessionFinish({...base,endedAt:'1970-01-01T00:00:00.000Z'}).action,'conflict');
 assert.equal(planDynamicSessionFinish({...base,sessionDocument:{...session,sets:[]}}).action,'conflict');
});
test('transaction completes and clears pointer without deleting session',async()=>{
 const updates=[],sets=[];
 const doc=(_db,...parts)=>parts.join('/');
 const root='users/alice/dynamicSessions/s';
 const pointer='users/alice/dynamicSessionControl/active';
 const runTransaction=async(_db,callback)=>callback({
  get:async key=>({exists:()=>true,data:()=>key===root?session:{sessionId:'s'}}),
  update:(...args)=>updates.push(args),set:(...args)=>sets.push(args)
 });
 const result=await finishDynamicWorkoutSession({db:{},uid:'alice',sessionId:'s',endedAt,doc,runTransaction,serverTimestamp:()=>123});
 assert.equal(result.action,'finish');
 assert.equal(updates.length,1);
 assert.equal(updates[0][0],root);
 assert.equal(updates[0][1].status,'completed');
 assert.equal(sets[0][0],pointer);
 assert.equal(sets[0][1].sessionId,null);
});
