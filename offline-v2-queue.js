import {makeV2OfflineSetOperation} from './offline-v2-replay.js';
import {inspectV2PendingEdits} from './offline-v2-queue-preflight.js';
import {syncV2OfflineOperation} from './offline-v2-sync.js';
import {enqueueOfflineOperation,listOfflineOperations,removeOfflineOperation} from './offline-store.js';

/**
 * Durable V2 offline queue adapter, scoped to one authenticated account.
 * A failed upload leaves the IndexedDB operation untouched.
 */
const scoped=(uid,id)=>uid+':v2:'+id;
export async function queueV2SetEdit({uid,id,sessionId,exerciseIndex,setIndex,done,baseRevision,baseCompletedAt,at=Date.now()}){
 if(!uid||typeof uid!=='string')throw Error('Usuário obrigatório');
 const operation=makeV2OfflineSetOperation({id:scoped(uid,id),sessionId,exerciseIndex,setIndex,done,baseRevision,baseCompletedAt,at});
 await enqueueOfflineOperation(operation);
 return operation;
}
export async function listPendingV2Edits(uid){
 if(!uid)throw Error('Usuário obrigatório');
 const items=await listOfflineOperations();
 return items.filter(op=>op.kind==='v2-mark-set'&&op.id.startsWith(uid+':v2:'))
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
export async function syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet}){
 if(!uid||!readRemoteExercise||!updateRemoteSet)throw Error('Sincronização incompleta');
 const pending=await listPendingV2Edits(uid);
 const preflight=inspectV2PendingEdits(pending);
 if(!preflight.safeToReplay)return [{status:'conflict',reason:'offline-queue-requires-rebase',issues:preflight.issues}];
 const results=[];
 for(const operation of pending){
  const result=await syncV2OfflineOperation({
   operation,readRemoteExercise,updateRemoteSet,
   acknowledge:removeOfflineOperation
  });
  results.push(result);
  // Stop after a conflict so later local edits cannot overtake it.
  if(result.status==='conflict')break;
 }
 return results;
}
