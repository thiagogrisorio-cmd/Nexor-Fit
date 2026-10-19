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
  tx.set(root,{...structuredClone(candidate),updatedAt:serverTimestamp()});
  tx.set(pointer,{sessionId:candidate.id,updatedAt:serverTimestamp()});
  return decision;
 });
}
