import {decodeDynamicSession} from './workout-plan-firestore-codec.js';

/** Pure, non-destructive completion decision. */
export function planDynamicSessionFinish({sessionId,sessionDocument,activePointer,endedAt}){
 if(typeof sessionId!=='string'||!sessionId||!sessionDocument||sessionDocument.id!==sessionId)
  return {action:'conflict',reason:'session-mismatch'};
 if(sessionDocument.status==='completed')
  return {action:'already-completed',sessionId};
 if(sessionDocument.status!=='active')return {action:'conflict',reason:'not-active'};
 if(activePointer?.sessionId!==sessionId)return {action:'conflict',reason:'pointer-mismatch'};
 if(typeof endedAt!=='string'||!Number.isFinite(Date.parse(endedAt)))
  return {action:'conflict',reason:'invalid-end-time'};
 let decoded;
 try{decoded=decodeDynamicSession(sessionDocument);}catch{return {action:'conflict',reason:'invalid-session-data'};}
 const start=Date.parse(decoded.startedAt),end=Date.parse(endedAt);
 if(!Number.isFinite(start)||end<start)return {action:'conflict',reason:'end-before-start'};
 return {action:'finish',sessionId,endedAt,durationSeconds:Math.floor((end-start)/1000)};
}
