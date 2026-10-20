import {planDynamicSessionFinish} from './workout-plan-finish.js';
import {encodeDynamicSession} from './workout-plan-firestore-codec.js';
import {planSessionCreation} from './workout-plan-session.js';

/**
 * Opt-in transactional repository for dynamic plans.
 * Does not write to legacy V1/V2 sessions and does not alter Firestore rules.
 * Deployment requires dedicated rule and emulator validation first.
 */
export async function createDynamicWorkoutSession({db,uid,candidate,runTransaction,doc,serverTimestamp}){
 if(!db||typeof uid!=='string'||!uid||!candidate?.id||!candidate?.requestId||
    !runTransaction||!doc||!serverTimestamp)throw Error('Parâmetros incompletos');
 const root=doc(db,'users',uid,'dynamicSessions',candidate.id);
 const pointer=doc(db,'users',uid,'dynamicSessionControl','active');
 return runTransaction(db,async tx=>{
  const [existing,control]=await Promise.all([tx.get(root),tx.get(pointer)]);
  const decision=planSessionCreation({
   candidate,existing:existing.exists()?existing.data():null,
   activeSessionId:control.exists()?control.data().sessionId:null
  });
  if(decision.action==='conflict')throw Error('Conflito: '+decision.reason);
  if(decision.action==='reuse')return {...decision};
  tx.set(root,{...encodeDynamicSession(candidate),updatedAt:serverTimestamp()});
  tx.set(pointer,{sessionId:candidate.id,updatedAt:serverTimestamp()});
  return decision;
 });
}

/** Atomically completes a dynamic session and releases only its own active pointer. */
export async function finishDynamicWorkoutSession({db,uid,sessionId,endedAt,runTransaction,doc,serverTimestamp}){
 if(!db||typeof uid!=='string'||!uid||typeof sessionId!=='string'||!sessionId||
    !runTransaction||!doc||!serverTimestamp)throw Error('Parâmetros incompletos');
 const root=doc(db,'users',uid,'dynamicSessions',sessionId);
 const pointer=doc(db,'users',uid,'dynamicSessionControl','active');
 return runTransaction(db,async tx=>{
  const [snapshot,control]=await Promise.all([tx.get(root),tx.get(pointer)]);
  const decision=planDynamicSessionFinish({
   sessionId,sessionDocument:snapshot.exists()?snapshot.data():null,
   activePointer:control.exists()?control.data():null,endedAt
  });
  if(decision.action==='conflict')throw Error('Conflito: '+decision.reason);
  if(decision.action==='already-completed')return decision;
  tx.update(root,{status:'completed',endedAt:decision.endedAt,
   durationSeconds:decision.durationSeconds,updatedAt:serverTimestamp()});
  tx.set(pointer,{sessionId:null,updatedAt:serverTimestamp()});
  return decision;
 });
}
