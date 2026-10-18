import {planV2OfflineSetReplay} from './offline-v2-replay.js';

/**
 * Sync a single durable V2 operation.
 * Acknowledge/delete only after the server transaction resolves successfully.
 * On conflict or network failure, preserve the local operation for recovery.
 */
export async function syncV2OfflineOperation({operation,readRemoteExercise,updateRemoteSet,acknowledge}){
 if(!operation||!readRemoteExercise||!updateRemoteSet||!acknowledge)
  throw Error('Sincronização V2 incompleta');
 const remote=await readRemoteExercise(operation);
 const plan=planV2OfflineSetReplay(operation,remote);
 if(plan.status!=='ready')return {status:'conflict',reason:plan.reason,operationId:operation.id};
 try{
  await updateRemoteSet({...operation,expectedRevision:plan.expectedRevision,expectedCompletedAt:plan.expectedCompletedAt});
 }catch(error){
  if(error?.message?.includes('Conflito'))return {status:'conflict',reason:'concurrent-update',operationId:operation.id};
  throw error;
 }
 // Re-read before deleting: a successful transaction alone is not a durable receipt.
 const confirmed=await readRemoteExercise(operation);
 const set=confirmed?.sets?.[operation.setIndex];
 if(confirmed?.sessionId!==operation.sessionId||confirmed?.index!==operation.exerciseIndex||
    confirmed?.revision!==plan.expectedRevision+1||set?.done!==operation.done||
    (operation.done&&typeof set?.completedAt!=='string')||
    (!operation.done&&set?.completedAt!==null))
  return {status:'conflict',reason:'confirmation-mismatch',operationId:operation.id};
 await acknowledge(operation.id);
 return {status:'synced',operationId:operation.id};
}
