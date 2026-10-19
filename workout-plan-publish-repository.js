import {planWorkoutPublication} from './workout-plan-publish.js';

/**
 * Trusted-backend-only transaction adapter. Never expose privileged credentials
 * or invoke this from a browser. Caller must read/verify manifest and all
 * children from the same immutable revision before calling.
 */
export async function publishWorkoutRevisionTransaction({
 db,uid,planId,revision,manifest,exerciseDocuments,expectedPublishedRevision,
 runTransaction,doc,serverTimestamp
}){
 if(!uid||!planId||!Number.isInteger(revision)||revision<1)
  throw new Error('Invalid publication identity');
 if(typeof runTransaction!=='function'||typeof doc!=='function'||typeof serverTimestamp!=='function')
  throw new Error('Missing Firestore transaction dependencies');
 const planRef=doc(db,'users',uid,'workoutPlans',planId);
 const revisionRef=doc(db,'users',uid,'workoutPlans',planId,'revisions',String(revision));
 return runTransaction(db,async tx=>{
  const planSnap=await tx.get(planRef);
  const revisionSnap=await tx.get(revisionRef);
  if(!planSnap.exists()||!revisionSnap.exists())throw new Error('Publication conflict: missing document');
  const storedManifest=revisionSnap.data();
  if(storedManifest.status!=='draft'||storedManifest.planId!==planId||storedManifest.revision!==revision)
   throw new Error('Publication conflict: invalid stored revision');
  // The caller's complete manifest must be identical to the stored manifest
  // (ignoring server-managed updatedAt). This is not a substitute for reading
  // child docs inside the transaction; production activation is prohibited.
  for(const key of ['planId','revision','status','name','origin','exerciseIds']){
   if(JSON.stringify(storedManifest[key])!==JSON.stringify(manifest?.[key]))
    throw new Error('Publication conflict: manifest changed');
  }
  const result=planWorkoutPublication({
   planId,revision,manifest,exerciseDocuments,
   planRecord:planSnap.data(),expectedPublishedRevision
  });
  if(result.action!=='publish')throw new Error('Publication '+result.action+': '+result.reason);
  tx.update(revisionRef,{status:'published',updatedAt:serverTimestamp()});
  tx.update(planRef,{publishedRevision:revision,updatedAt:serverTimestamp()});
  return {action:'publish',planId,revision,previousPublishedRevision:result.previousPublishedRevision};
 });
}
