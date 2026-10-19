import {validateWorkoutPlan} from './workout-plan-model.js';

/**
 * Pure publication preflight. Does not write Firestore or grant client authority.
 * A trusted server must re-read and validate every child before publishing.
 */
export function assessWorkoutPlanPublication({planId,revision,manifest,exerciseDocuments}){
 if(typeof planId!=='string'||!planId.trim()||!Number.isInteger(revision)||revision<1)
  return {action:'reject',reason:'invalid-identity'};
 if(!manifest||manifest.planId!==planId||manifest.revision!==revision||manifest.status!=='draft')
  return {action:'reject',reason:'invalid-manifest'};
 if(!Array.isArray(manifest.exerciseIds)||manifest.exerciseIds.length<1||manifest.exerciseIds.length>100)
  return {action:'reject',reason:'invalid-manifest-exercises'};
 if(new Set(manifest.exerciseIds).size!==manifest.exerciseIds.length)
  return {action:'reject',reason:'duplicate-manifest-id'};
 if(!Array.isArray(exerciseDocuments)||exerciseDocuments.length!==manifest.exerciseIds.length)
  return {action:'reject',reason:'incomplete-exercises'};
 const byId=new Map();
 for(const item of exerciseDocuments){
  if(!item||typeof item.id!=='string'||byId.has(item.id))
   return {action:'reject',reason:'duplicate-or-invalid-exercise'};
  byId.set(item.id,item);
 }
 const ordered=[];
 for(let i=0;i<manifest.exerciseIds.length;i++){
  const id=manifest.exerciseIds[i],item=byId.get(id);
  if(!item||item.order!==i||item.revision!==revision)
   return {action:'reject',reason:'incomplete-or-mismatched-exercises'};
  ordered.push(item);
 }
 try {
  const validated=validateWorkoutPlan({
   id:planId,name:manifest.name,origin:manifest.origin,revision,
   exercises:ordered
  });
  return {action:'ready',plan:validated};
 } catch {
  return {action:'reject',reason:'invalid-exercise-data'};
 }
}
