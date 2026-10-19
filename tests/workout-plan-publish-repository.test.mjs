import test from 'node:test';
import assert from 'node:assert/strict';
import {publishWorkoutRevisionTransaction} from '../workout-plan-publish-repository.js';
const manifest={planId:'p1',revision:2,status:'draft',name:'Treino',origin:'manual',exerciseIds:['e1']};
const exercise={id:'e1',revision:2,name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0};
function setup({publishedRevision=1,storedManifest=manifest,archived=false}={}){
 const writes=[];
 const snapshots={
  'users/u1/workoutPlans/p1':{id:'p1',publishedRevision,archived},
  'users/u1/workoutPlans/p1/revisions/2':storedManifest
 };
 const dependencies={
  db:{},uid:'u1',planId:'p1',revision:2,manifest,
  exerciseDocuments:[exercise],expectedPublishedRevision:1,
  doc:(_db,...segments)=>segments.join('/'),
  serverTimestamp:()=> 'server-time',
  runTransaction:async(_db,fn)=>fn({
   get:async ref=>({exists:()=>Object.hasOwn(snapshots,ref),data:()=>snapshots[ref]}),
   update:(ref,data)=>writes.push({ref,data})
  })
 };
 return {dependencies,writes};
}
test('updates revision and published pointer together after checks',async()=>{
 const {dependencies,writes}=setup();
 const result=await publishWorkoutRevisionTransaction(dependencies);
 assert.equal(result.action,'publish');
 assert.equal(writes.length,2);
 assert.deepEqual(writes[0].data,{status:'published',updatedAt:'server-time'});
 assert.deepEqual(writes[1].data,{publishedRevision:2,updatedAt:'server-time'});
});
test('stale publication pointer never writes',async()=>{
 const {dependencies,writes}=setup({publishedRevision:2});
 await assert.rejects(publishWorkoutRevisionTransaction(dependencies),/Publication conflict/);
 assert.equal(writes.length,0);
});
test('changed manifest and archived plan never write',async()=>{
 const changed=setup({storedManifest:{...manifest,name:'Changed'}});
 await assert.rejects(publishWorkoutRevisionTransaction(changed.dependencies),/manifest changed/);
 assert.equal(changed.writes.length,0);
 const archived=setup({archived:true});
 await assert.rejects(publishWorkoutRevisionTransaction(archived.dependencies),/Publication reject/);
 assert.equal(archived.writes.length,0);
});
test('missing exercise blocks publication without writes',async()=>{
 const {dependencies,writes}=setup();
 dependencies.exerciseDocuments=[];
 await assert.rejects(publishWorkoutRevisionTransaction(dependencies),/Publication reject/);
 assert.equal(writes.length,0);
});
