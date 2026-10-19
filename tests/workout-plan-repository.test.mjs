import test from 'node:test';
import assert from 'node:assert/strict';
import {createDynamicWorkoutSession} from '../workout-plan-repository.js';
import {prepareWorkoutFromPlan} from '../workout-plan-session.js';
const plan={id:'p1',name:'Personalizado',origin:'manual',exercises:[{id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'}]};
const candidate=prepareWorkoutFromPlan({plan,sessionId:'s1',requestId:'request-1',now:1000});
function harness(initial={}){
 const records=new Map(Object.entries(initial));
 const writes=[];
 const doc=(_db,...parts)=>parts.join('/');
 const runTransaction=async(_db,callback)=>{
  const tx={
   get:async key=>({exists:()=>records.has(key),data:()=>records.get(key)}),
   set:(key,value)=>writes.push({key,value})
  };
  return callback(tx);
 };
 return {records,writes,doc,runTransaction,serverTimestamp:()=>123};
}
const root='users/u1/dynamicSessions/s1',pointer='users/u1/dynamicSessionControl/active';
test('creates one dynamic session and its active pointer in a transaction',async()=>{
 const h=harness();
 const result=await createDynamicWorkoutSession({db:{},uid:'u1',candidate,...h});
 assert.equal(result.action,'create');
 assert.equal(h.writes.length,2);
 assert.equal(h.writes[0].key,root);
 assert.equal(h.writes[1].key,pointer);
 assert.deepEqual(h.writes[0].value.sets.map(x=>x.length),[3]);
});
test('idempotent retry performs no writes',async()=>{
 const h=harness({[root]:candidate,[pointer]:{sessionId:'s1'}});
 const result=await createDynamicWorkoutSession({db:{},uid:'u1',candidate,...h});
 assert.equal(result.action,'reuse');
 assert.equal(h.writes.length,0);
});
test('conflicting request or active workout never writes',async()=>{
 for(const initial of [{[root]:{...candidate,requestId:'other'}},{[pointer]:{sessionId:'another'}}]){
  const h=harness(initial);
  await assert.rejects(()=>createDynamicWorkoutSession({db:{},uid:'u1',candidate,...h}),/Conflito/);
  assert.equal(h.writes.length,0);
 }
});
