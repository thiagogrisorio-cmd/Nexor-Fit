import {inspectV2MigrationBackup} from './session-v2-recovery-plan.js';

/**
 * Safe recovery decision only; intentionally performs no writes.
 * Any post-migration edit blocks automated recovery to prevent data loss.
 */
export function assessV2RecoverySafety({sessionId,backup,parent,exerciseDocuments}){
 const inspected=inspectV2MigrationBackup({sessionId,backup,parent,exerciseDocuments});
 if(inspected.status!=='ready-for-manual-review')return inspected;
 const {legacy}=inspected;
 if(parent.status!==legacy.status||parent.startedAt!==legacy.startedAt||
    parent.day!==legacy.day||parent.restSeconds!==legacy.restSeconds||
    parent.endedAt!==legacy.endedAt||parent.durationSeconds!==legacy.durationSeconds||
    parent.restUntil!==legacy.restUntil)
  return {status:'manual-review-required',sessionId,reason:'parent-changed'};
 const expected=legacy.sets;
 for(const exercise of exerciseDocuments){
  if(exercise.revision!==0)
   return {status:'manual-review-required',sessionId,reason:'exercise-revision-changed',exerciseIndex:exercise.index};
  const original=expected[exercise.index];
  for(let i=0;i<2;i++){
   if(exercise.sets[i].done!==original[i].done||exercise.sets[i].completedAt!==original[i].completedAt)
    return {status:'manual-review-required',sessionId,reason:'exercise-content-changed',exerciseIndex:exercise.index};
  }
 }
 return {status:'eligible-for-privileged-restore',sessionId,checks:inspected.checks,
  warning:'Only a privileged, audited restore transaction may act on this assessment.'};
}
