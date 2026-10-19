import {assessWorkoutPlanPublication} from './workout-plan-publication.js';

/**
 * Trusted-server publication planner. Pure logic: no Firestore writes.
 * The caller must re-read the manifest and every child under server authority,
 * then atomically compare-and-swap the parent pointer in a transaction.
 */
export function planWorkoutPublication({planId,revision,manifest,exerciseDocuments,planRecord,expectedPublishedRevision}){
 const checked=assessWorkoutPlanPublication({planId,revision,manifest,exerciseDocuments});
 if(checked.action!=='ready')return checked;
 if(!planRecord||planRecord.id!==planId||planRecord.archived===true)
  return {action:'reject',reason:'missing-or-archived-plan'};
 if(!Number.isInteger(expectedPublishedRevision)||expectedPublishedRevision<0)
  return {action:'reject',reason:'invalid-expected-revision'};
 const current=planRecord.publishedRevision??0;
 if(!Number.isInteger(current)||current<0||current!==expectedPublishedRevision)
  return {action:'conflict',reason:'stale-published-revision'};
 if(revision<=current)return {action:'conflict',reason:'revision-not-newer'};
 return {
  action:'publish',planId,revision,previousPublishedRevision:current,
  prescription:checked.plan
 };
}
