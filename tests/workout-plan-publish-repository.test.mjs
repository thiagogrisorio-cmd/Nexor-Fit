import test from 'node:test';
import assert from 'node:assert/strict';
import {publishWorkoutRevisionTransaction} from '../workout-plan-publish-repository.js';
const manifest={planId:'p1',revision:2,status:'draft',name:'Treino',origin:'manual',exerciseIds:['e1']};
const exercise={id:'e1',revision:2,name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90,order:0};
function setup({publishedRevision=1,storedManifest=manifest,archived=false,child=exercise}={}){
 const writes=[],reads=[];
 const snapshots={
  'users/u1/workoutPlans/p1':{id:'p1',publishedRevision,archived},
  'users/u1/workoutPlans/p1/revisions/2':storedManifest
 };
 if(child)snapshots['users/u1/workoutPlans/p1/revisions/2/exercises/e1']=child;
 const dependencies={
  db:{},uid:'u1',planId:'p1',revision:2,expectedPublishedRevision:1,
  doc:(_db,...segments)=>segments.join('/'),
  serverTimestamp:()=> 'server-time',
  runTransaction:async(_db,fn)=>fn({
   get:async ref=>{reads.push(ref);return {exists:()=>Object.hasOwn(snapshots,ref),data:()=>snapshots[ref]};},
   update:(ref,data)=>writes.push({ref,data})
  })
 };
 return {dependencies,writes,reads};
}
test('reads manifest and child before atomically staging publication writes',async()=>{
 const {dependencies,writes,reads}=setup();
 const result=await publishWorkoutRevisionTransaction(dependencies);
 assert.equal(result.action,'publish');
 assert.equal(reads.length,3);
 assert.equal(reads[2],'users/u1/workoutPlans/p1/revisions/2/exercises/e1');
 assert.equal(writes.length,2);
 assert.deepEqual(writes[0].data,{status:'published',updatedAt:'server-time'});
 assert.deepEqual(writes[1].data,{publishedRevision:2,updatedAt:'server-time'});
});
test('stale pointer never writes',async()=>{
 const {dependencies,writes}=setup({publishedRevision:2});
 await assert.rejects(publishWorkoutRevisionTransaction(dependencies),/Publication conflict/);
 assert.equal(writes.length,0);
});
test('missing child and archived plan never write',async()=>{
 const missing=setup({child:null});
 await assert.rejects(publishWorkoutRevisionTransaction(missing.dependencies),/missing exercise/);
 assert.equal(missing.writes.length,0);
 const archived=setup({archived:true});
 await assert.rejects(publishWorkoutRevisionTransaction(archived.dependencies),/Publication reject/);
 assert.equal(archived.writes.length,0);
});
test('invalid child and tampered manifest never write',async()=>{
 const bad=setup({child:{...exercise,sets:13}});
 await assert.rejects(publishWorkoutRevisionTransaction(bad.dependencies),/Publication reject/);
 assert.equal(bad.writes.length,0);
 const tampered=setup({storedManifest:{...manifest,exerciseIds:['e1','e1']}});
 await assert.rejects(publishWorkoutRevisionTransaction(tampered.dependencies),/duplicate exercise IDs/);
 assert.equal(tampered.writes.length,0);
});
