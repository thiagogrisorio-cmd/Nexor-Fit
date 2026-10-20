import {assessDynamicSessionResume} from './workout-plan-resume.js';

/**
 * Read-only decision for cross-device session recovery.
 * Never trusts cached data to override the server's active pointer.
 */
export function assessCrossDeviceWorkoutRecovery({
 uid,ownerUid,serverPointer,serverSession,localSession
}){
 if(typeof uid!=='string'||!uid||uid!==ownerUid)
  return {action:'blocked',reason:'account-mismatch'};
 if(!serverPointer||typeof serverPointer!=='object')
  return {action:'manual-review',reason:'server-pointer-unavailable'};
 const activeId=serverPointer.sessionId;
 if(activeId===null){
  if(localSession?.status==='active')
   return {action:'manual-review',reason:'local-active-without-server-pointer'};
  return {action:'no-active-session'};
 }
 if(typeof activeId!=='string'||!activeId.trim())
  return {action:'manual-review',reason:'invalid-server-pointer'};
 const decision=assessDynamicSessionResume({
  sessionId:activeId,sessionDocument:serverSession,
  activePointer:serverPointer,uid,ownerUid
 });
 if(decision.action!=='resume')return decision;
 if(localSession&&localSession.id===activeId){
  if(localSession.requestId!==decision.session.requestId||
     localSession.planId!==decision.session.planId||
     localSession.planRevision!==decision.session.planRevision)
   return {action:'manual-review',reason:'local-server-session-conflict'};
 }
 return {
  action:'resume-server-session',session:decision.session,
  progress:decision.progress,
  localState:localSession?.id===activeId?'compare-before-sync':'different-or-missing'
 };
}
