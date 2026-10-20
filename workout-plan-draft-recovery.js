import {assessWorkoutPlanPublication} from './workout-plan-publication.js';

/**
 * Read-only recovery assessment for an interrupted workout-plan draft.
 * No Firestore writes, no implicit publication and no destructive cleanup.
 */
export function assessWorkoutDraftRecovery({
 planId,revision,manifest,exerciseDocuments,publishedRevision
}){
 if(!Number.isInteger(publishedRevision)||publishedRevision<0)
  return {action:'manual-review',reason:'invalid-published-pointer'};
 if(!Number.isInteger(revision)||revision<1||typeof planId!=='string'||!planId.trim())
  return {action:'manual-review',reason:'invalid-draft-identity'};
 if(revision<=publishedRevision)
  return {action:'manual-review',reason:'draft-not-newer-than-published'};
 if(!manifest||manifest.planId!==planId||manifest.revision!==revision)
  return {action:'manual-review',reason:'manifest-mismatch'};
 if(manifest.status==='published')
  return {action:'manual-review',reason:'published-pointer-mismatch'};
 if(manifest.status!=='draft')
  return {action:'manual-review',reason:'unsupported-status'};
 if(!Array.isArray(manifest.exerciseIds)||manifest.exerciseIds.length<1||manifest.exerciseIds.length>100)
  return {action:'manual-review',reason:'invalid-exercise-list'};
 if(new Set(manifest.exerciseIds).size!==manifest.exerciseIds.length)
  return {action:'manual-review',reason:'duplicate-exercise-ids'};
 if(!Array.isArray(exerciseDocuments))
  return {action:'manual-review',reason:'invalid-exercise-documents'};
 const expected=new Set(manifest.exerciseIds),found=new Set();
 for(const item of exerciseDocuments){
  if(!item||typeof item.id!=='string'||!expected.has(item.id)||found.has(item.id))
   return {action:'manual-review',reason:'unexpected-or-duplicate-child'};
  if(item.revision!==revision)
   return {action:'manual-review',reason:'child-revision-mismatch'};
  found.add(item.id);
 }
 const missing=manifest.exerciseIds.filter(id=>!found.has(id));
 if(missing.length)
  return {action:'resume-draft',missingExerciseIds:missing,publishedRevision};
 const ready=assessWorkoutPlanPublication({planId,revision,manifest,exerciseDocuments});
 if(ready.action!=='ready')
  return {action:'manual-review',reason:ready.reason};
 return {action:'ready-for-publication-review',publishedRevision,revision};
}
