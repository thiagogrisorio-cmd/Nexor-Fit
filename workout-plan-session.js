import {decodeDynamicSession} from './workout-plan-firestore-codec.js';
import {validateWorkoutPlan,snapshotWorkoutPrescription} from './workout-plan-model.js';

/**
 * Pure planning boundary for a future dynamic-plan session.
 * Existing V1/V2 12x2 session documents are not rewritten.
 * A stable requestId lets callers retry without creating a new session ID.
 */
export function prepareWorkoutFromPlan({plan,sessionId,requestId,now=Date.now()}){
 const prescription=snapshotWorkoutPrescription(plan);
 if(typeof sessionId!=='string'||!sessionId.trim()||sessionId.length>128)throw Error('ID de sessão inválido');
 if(typeof requestId!=='string'||!requestId.trim()||requestId.length>128)throw Error('ID de solicitação inválido');
 if(!Number.isFinite(now)||now<0)throw Error('Horário inválido');
 return {
  id:sessionId,requestId,planId:prescription.id,planRevision:prescription.revision,
  status:'active',startedAt:new Date(now).toISOString(),endedAt:null,
  prescription,sets:prescription.exercises.map(exercise=>
   Array.from({length:exercise.sets},()=>({done:false,completedAt:null})))
 };
}
/**
 * Idempotency decision is read-only: existing ID+request can be reused,
 * conflicting IDs are rejected. Firestore integration must enforce atomically.
 */
export function planSessionCreation({candidate,existing,activeSessionId}){
 let persisted=existing;
 if(existing?.sets?.every(row=>row&&Array.isArray(row.items))){
  try{persisted=decodeDynamicSession(existing);}catch{return {action:'conflict',reason:'invalid-existing-session'};}
 }
 if(!candidate?.id||!candidate.requestId)throw Error('Sessão inválida');
 if(existing){
  if(persisted.id===candidate.id&&persisted.requestId===candidate.requestId&&
     persisted.planId===candidate.planId&&persisted.planRevision===candidate.planRevision&&
     persisted.status==='active'&&candidate.status==='active'&&
     persisted.startedAt===candidate.startedAt&&
     JSON.stringify(persisted.prescription)===JSON.stringify(candidate.prescription)&&
     JSON.stringify(persisted.sets)===JSON.stringify(candidate.sets)&&
     activeSessionId===candidate.id)return {action:'reuse',sessionId:candidate.id};
  return {action:'conflict',reason:'session-id-already-used'};
 }
 if(activeSessionId)return {action:'conflict',reason:'another-session-active'};
 return {action:'create',sessionId:candidate.id};
}
