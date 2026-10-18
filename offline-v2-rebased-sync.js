import {planV2SequentialRebase} from './offline-v2-sequential-rebase.js';

/**
 * Replay a group of independent set edits. Each acknowledged operation is
 * removed only after a successful remote write. Stops at first conflict.
 */
export async function replayV2RebasedGroup({operations,readRemoteExercise,updateRemoteSet,acknowledge,recordReceipt}){
 if(!operations?.length||!readRemoteExercise||!updateRemoteSet||!acknowledge)
  throw Error('Reconciliação incompleta');
 const initial=await readRemoteExercise(operations[0]);
 const plan=planV2SequentialRebase(operations,initial);
 if(plan.status!=='ready')return {status:'conflict',reason:plan.reason,processed:0};
 let processed=0;
 for(const step of plan.steps){
  const remote=await readRemoteExercise(step.operation);
  if(remote?.sessionId!==step.operation.sessionId||remote?.index!==step.operation.exerciseIndex||
     remote.revision!==step.expectedRevision||
     remote.sets?.[step.operation.setIndex]?.completedAt!==step.expectedCompletedAt)
   return {status:'conflict',reason:'remote-changed-during-replay',processed};
  try{
   await updateRemoteSet({...step.operation,expectedRevision:step.expectedRevision,
    expectedCompletedAt:step.expectedCompletedAt});
  }catch(error){
   if(error?.message?.includes('Conflito'))
    return {status:'conflict',reason:'concurrent-update',processed};
   throw error;
  }
  const confirmed=await readRemoteExercise(step.operation);
  const set=confirmed?.sets?.[step.operation.setIndex];
  if(confirmed?.sessionId!==step.operation.sessionId||confirmed?.index!==step.operation.exerciseIndex||
     confirmed?.revision!==step.expectedRevision+1||set?.done!==step.operation.done||
     (step.operation.done&&typeof set?.completedAt!=='string')||
     (!step.operation.done&&set?.completedAt!==null))
   return {status:'conflict',reason:'confirmation-mismatch',processed};
  if(recordReceipt){
   await recordReceipt({id:step.operation.id,sessionId:step.operation.sessionId,
    exerciseIndex:step.operation.exerciseIndex,setIndex:step.operation.setIndex,
    done:set.done,completedAt:set.completedAt,revisionBefore:step.expectedRevision,
    revisionAfter:confirmed.revision});
  }
  await acknowledge(step.operation.id);
  processed++;
 }
 return {status:'synced',processed};
}
