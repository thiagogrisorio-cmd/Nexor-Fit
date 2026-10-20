import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkoutPlan,updateWorkoutPlan,archiveWorkoutPlanRecord} from '../workout-plan-store.js';
const plan={id:'p1',name:'Treino próprio',origin:'manual',revision:1,exercises:[{id:'e1',name:'Remada',muscleGroup:'Costas',sets:3,reps:'10'}]};
const path='users/u1/workoutPlans/p1';
function harness(initial){
 const records=new Map(initial?[[path,initial]]:[]);
 const writes=[];
 const tx={
  get:async ref=>({exists:()=>records.has(ref),data:()=>records.get(ref)}),
  set:(ref,value)=>{writes.push(['set',ref,value]);records.set(ref,value)},
  update:(ref,value)=>{writes.push(['update',ref,value]);records.set(ref,{...records.get(ref),...value})}
 };
 return {db:{},uid:'u1',doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=>123,writes,records};
}
test('creates an isolated user plan and rejects duplicate ids',async()=>{
 const h=harness();
 await createWorkoutPlan({...h,plan});
 assert.equal(h.writes[0][1],path);
 assert.equal(h.records.get(path).revision,1);
 await assert.rejects(()=>createWorkoutPlan({...h,plan}),/já existe/);
 assert.equal(h.writes.length,1);
});
test('editing requires exact expected revision and preserves prior source',async()=>{
 const h=harness({...plan,archived:false});
 const updated={...plan,name:'Novo nome',revision:2};
 await updateWorkoutPlan({...h,plan:updated,expectedRevision:1});
 assert.equal(h.records.get(path).name,'Novo nome');
 await assert.rejects(()=>updateWorkoutPlan({...h,plan:{...updated,revision:2},expectedRevision:1}),/Conflito/);
 assert.equal(plan.name,'Treino próprio');
});
test('archiving is non-destructive and idempotent at same revision',async()=>{
 const h=harness({...plan,archived:false});
 const first=await archiveWorkoutPlanRecord({...h,id:'p1',expectedRevision:1});
 assert.deepEqual(first,{id:'p1',revision:2,archived:true});
 const again=await archiveWorkoutPlanRecord({...h,id:'p1',expectedRevision:2});
 assert.deepEqual(again,first);
 assert.equal(h.writes.length,1);
 await assert.rejects(()=>updateWorkoutPlan({...h,plan:{...plan,revision:3},expectedRevision:2}),/arquivado/);
});
