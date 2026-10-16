import {listPendingV2Edits,syncPendingV2Edits} from './offline-v2-queue.js';

/**
 * Reconnect coordinator. Reads durable IndexedDB operations afresh on every run.
 * Prevents concurrent sync attempts for the same account in this JS context.
 * UI integration is deliberately opt-in.
 */
const inFlight=new Map();
export function resumeV2OfflineSync({uid,isCurrentAccount,isOnline,readRemoteExercise,updateRemoteSet}){
 if(!uid||!isCurrentAccount||!isOnline)throw Error('Contexto de retomada incompleto');
 if(inFlight.has(uid))return inFlight.get(uid);
 const task=(async()=>{
  if(!isCurrentAccount(uid)||!isOnline())return {status:'paused',processed:0};
  const pending=await listPendingV2Edits(uid);
  if(!pending.length)return {status:'empty',processed:0};
  if(!isCurrentAccount(uid)||!isOnline())return {status:'paused',processed:0};
  const results=await syncPendingV2Edits({
   uid,
   readRemoteExercise:async operation=>{
    if(!isCurrentAccount(uid)||!isOnline())throw Error('Sincronização pausada: conta ou conexão alterada');
    return readRemoteExercise(operation);
   },
   updateRemoteSet:async operation=>{
    if(!isCurrentAccount(uid)||!isOnline())throw Error('Sincronização pausada: conta ou conexão alterada');
    return updateRemoteSet(operation);
   }
  });
  return {status:results.some(x=>x.status==='conflict')?'conflict':'synced',processed:results.length,results};
 })();
 inFlight.set(uid,task);
 task.finally(()=>{if(inFlight.get(uid)===task)inFlight.delete(uid);}).catch(()=>{});
 return task;
}
