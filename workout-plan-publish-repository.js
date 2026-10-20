import {planWorkoutPublication} from './workout-plan-publish.js';

/**
 * Trusted-backend-only transaction adapter. Reads all children inside the
 * transaction before writing the published pointer. Not wired to production.
 */
export async function publishWorkoutRevisionTransaction({
 db,uid,planId,revision,expectedPublishedRevision,runTransaction,doc,serverTimestamp
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
  const manifest=revisionSnap.data();
  if(manifest.status!=='draft'||manifest.planId!==planId||manifest.revision!==revision)
   throw new Error('Publication conflict: invalid stored revision');
  if(!Array.isArray(manifest.exerciseIds)||manifest.exerciseIds.length<1||manifest.exerciseIds.length>100)
   throw new Error('Publication conflict: invalid manifest exercise list');
  if(new Set(manifest.exerciseIds).size!==manifest.exerciseIds.length)
   throw new Error('Publication conflict: duplicate exercise IDs');
  const childRefs=manifest.exerciseIds.map(id=>{
   if(typeof id!=='string'||!id.trim()||id.includes('/'))
    throw new Error('Publication conflict: invalid child ID');
   return doc(db,'users',uid,'workoutPlans',planId,'revisions',String(revision),'exercises',id);
  });
  // Firestore requires all reads to precede writes. Reading children here also
  // makes concurrent child edits conflict with this transaction.
  const childSnapshots=await Promise.all(childRefs.map(ref=>tx.get(ref)));
  if(childSnapshots.some(s=>!s.exists()))throw new Error('Publication conflict: missing exercise');
  const exerciseDocuments=childSnapshots.map(s=>s.data());
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
