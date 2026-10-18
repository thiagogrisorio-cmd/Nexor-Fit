// Read-only export of retired V1 operations, scoped to the signed-in account.
// No queue mutation, Firestore write, or automatic V1-to-V2 replay occurs here.
import {pendingOfflineOperations,readOfflineWorkout} from './offline-controller.js';
export async function buildLegacyV1RecoveryExport({uid,currentUid,exportedAt=new Date().toISOString()}){
 if(!uid||uid!==currentUid)throw Error('Conta alterada; exportação cancelada');
 const operations=await pendingOfflineOperations(uid);
 if(uid!==currentUid)throw Error('Conta alterada; exportação cancelada');
 const sessionIds=[...new Set(operations.map(op=>op.sessionId))].sort();
 const sessions=[];
 for(const sessionId of sessionIds){
  const session=await readOfflineWorkout(uid,sessionId);
  if(uid!==currentUid)throw Error('Conta alterada; exportação cancelada');
  sessions.push({sessionId,session});
 }
 return {format:'nexor-fit-v1-recovery',version:1,exportedAt,uid,operations,sessions};
}
