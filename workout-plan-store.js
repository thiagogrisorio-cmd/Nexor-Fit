import {validateWorkoutPlan} from './workout-plan-model.js';

/**
 * Opt-in Firestore repository for user-owned workout plans.
 * No legacy paths, session history, or Firebase rules are modified.
 * Firestore rule coverage and emulator integration are required before UI wiring.
 */
const planRef=(db,doc,uid,id)=>doc(db,'users',uid,'workoutPlans',id);
function check({db,uid,doc,runTransaction,serverTimestamp}){
 if(!db||typeof uid!=='string'||!uid.trim()||!doc||!runTransaction||!serverTimestamp)
  throw Error('Parâmetros incompletos');
}
export async function createWorkoutPlan({db,uid,plan,doc,runTransaction,serverTimestamp}){
 check({db,uid,doc,runTransaction,serverTimestamp});
 const value=validateWorkoutPlan(plan);
 const ref=planRef(db,doc,uid,value.id);
 return runTransaction(db,async tx=>{
  const current=await tx.get(ref);
  if(current.exists())throw Error('Plano já existe');
  tx.set(ref,{...value,archived:false,updatedAt:serverTimestamp()});
  return {id:value.id,revision:value.revision};
 });
}
export async function updateWorkoutPlan({db,uid,plan,expectedRevision,doc,runTransaction,serverTimestamp}){
 check({db,uid,doc,runTransaction,serverTimestamp});
 const value=validateWorkoutPlan(plan);
 if(!Number.isInteger(expectedRevision)||expectedRevision<1||value.revision!==expectedRevision+1)
  throw Error('Revisão esperada inválida');
 const ref=planRef(db,doc,uid,value.id);
 return runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref);
  if(!snapshot.exists())throw Error('Plano não encontrado');
  const previous=snapshot.data();
  if(previous.archived)throw Error('Plano arquivado');
  if(previous.revision!==expectedRevision)throw Error('Conflito de revisão');
  if(previous.origin!==value.origin)throw Error('Origem imutável');
  tx.set(ref,{...value,archived:false,updatedAt:serverTimestamp()});
  return {id:value.id,revision:value.revision};
 });
}
export async function archiveWorkoutPlanRecord({db,uid,id,expectedRevision,doc,runTransaction,serverTimestamp}){
 check({db,uid,doc,runTransaction,serverTimestamp});
 if(typeof id!=='string'||!id.trim()||id.length>128)throw Error('ID inválido');
 if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw Error('Revisão inválida');
 const ref=planRef(db,doc,uid,id);
 return runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref);
  if(!snapshot.exists())throw Error('Plano não encontrado');
  const previous=snapshot.data();
  if(previous.revision!==expectedRevision)throw Error('Conflito de revisão');
  if(previous.archived)return {id,revision:previous.revision,archived:true};
  tx.update(ref,{archived:true,revision:expectedRevision+1,updatedAt:serverTimestamp()});
  return {id,revision:expectedRevision+1,archived:true};
 });
}
