import {makeV2OfflineSetOperation} from './offline-v2-replay.js';
import {inspectV2PendingEdits} from './offline-v2-queue-preflight.js';
import {syncV2OfflineOperation} from './offline-v2-sync.js';
import {saveReceipt} from './offline-v2-receipts.js';
import {replayV2RebasedGroup} from './offline-v2-rebased-sync.js';
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
export async function syncPendingV2Edits({uid,readRemoteExercise,updateRemoteSet,canAcknowledge=()=>true}){
 if(!uid||!readRemoteExercise||!updateRemoteSet)throw Error('Sincronização incompleta');
 const acknowledge=async id=>{
  if(!canAcknowledge())throw Error('Sincronização pausada: conta ou conexão alterada antes da confirmação');
  await removeOfflineOperation(id);
 };
 const pending=await listPendingV2Edits(uid);
 const preflight=inspectV2PendingEdits(pending);
 if(!preflight.safeToReplay){
  if(preflight.issues.some(issue=>issue.status!=='requires-sequential-rebase'))
   return [{status:'conflict',reason:'offline-queue-invalid',issues:preflight.issues}];
  const groups=new Map();
  for(const operation of pending){
   const key=operation.sessionId+':'+operation.exerciseIndex;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(operation);
  }
  const results=[];
  for(const group of groups.values()){
   const result=group.length>1
    ?await replayV2RebasedGroup({operations:group,readRemoteExercise,updateRemoteSet,acknowledge,recordReceipt:saveReceipt})
    :await syncV2OfflineOperation({operation:group[0],readRemoteExercise,updateRemoteSet,acknowledge});
   results.push(result);
   if(result.status==='conflict')break;
  }
  return results;
 }
 const results=[];
 for(const operation of pending){
  const result=await syncV2OfflineOperation({
   operation,readRemoteExercise,updateRemoteSet,
   acknowledge
  });
  results.push(result);
  // Stop after a conflict so later local edits cannot overtake it.
  if(result.status==='conflict')break;
 }
 return results;
}
