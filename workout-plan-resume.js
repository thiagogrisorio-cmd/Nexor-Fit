import {decodeDynamicSession} from './workout-plan-firestore-codec.js';

/**
 * Read-only recovery assessment for dynamic sessions.
 * Never creates, rewrites or completes sessions automatically.
 */
export function assessDynamicSessionResume({sessionId,sessionDocument,activePointer,uid,ownerUid}){
 if(typeof uid!=='string'||!uid||uid!==ownerUid)return {action:'blocked',reason:'account-mismatch'};
 if(!sessionId||typeof sessionId!=='string')return {action:'blocked',reason:'invalid-session-id'};
 if(!sessionDocument)return {action:'blocked',reason:'session-missing'};
 if(sessionDocument.id!==sessionId)return {action:'blocked',reason:'session-id-mismatch'};
 if(!activePointer||activePointer.sessionId!==sessionId)return {action:'manual-review',reason:'active-pointer-mismatch'};
 if(sessionDocument.status!=='active')return {action:'blocked',reason:'session-not-active'};
 try{
  const session=decodeDynamicSession(sessionDocument);
  const totalSets=session.sets.reduce((sum,row)=>sum+row.length,0);
  const completedSets=session.sets.reduce((sum,row)=>sum+row.filter(set=>set.done).length,0);
  return {action:'resume',session,progress:{completedSets,totalSets}};
 }catch{
  return {action:'manual-review',reason:'invalid-session-data'};
 }
}
