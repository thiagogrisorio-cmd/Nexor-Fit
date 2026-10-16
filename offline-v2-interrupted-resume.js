/**
 * Resume guard for a partially acknowledged V2 exercise.
 * A remote revision alone cannot prove which device made the previous write.
 * Requires a durable receipt for the preceding operation before rebasing.
 */
export function planV2InterruptedResume({pending,remote,receipt}){
 if(!pending||!remote)return {status:'conflict',reason:'missing-state'};
 if(remote.sessionId!==pending.sessionId||remote.index!==pending.exerciseIndex)
  return {status:'conflict',reason:'wrong-exercise'};
 if(remote.revision===pending.baseRevision&&
    remote.sets?.[pending.setIndex]?.completedAt===pending.baseCompletedAt)
  return {status:'ready',expectedRevision:pending.baseRevision,expectedCompletedAt:pending.baseCompletedAt};
 if(!receipt||receipt.sessionId!==pending.sessionId||
    receipt.exerciseIndex!==pending.exerciseIndex||
    receipt.revisionBefore!==pending.baseRevision||
    receipt.revisionAfter!==remote.revision||
    receipt.setIndex===pending.setIndex||
    !Number.isInteger(receipt.setIndex)||receipt.setIndex<0||receipt.setIndex>1)
  return {status:'manual-review',reason:'missing-provenance'};
 const prior=remote.sets?.[receipt.setIndex];
 if(!prior||prior.done!==receipt.done||prior.completedAt!==receipt.completedAt||
    remote.sets?.[pending.setIndex]?.completedAt!==pending.baseCompletedAt)
  return {status:'conflict',reason:'remote-changed'};
 return {status:'ready',expectedRevision:remote.revision,expectedCompletedAt:pending.baseCompletedAt};
}
