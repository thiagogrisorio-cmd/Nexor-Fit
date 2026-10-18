export function assessPendingReceipt(op,receipt,remote){
 if(!op||!remote)return {status:'manual-review'};
 if(remote.sessionId!==op.sessionId||remote.index!==op.exerciseIndex)return {status:'conflict'};
 const set=remote.sets?.[op.setIndex];
 if(!set)return {status:'conflict'};
 if(remote.revision===op.baseRevision&&set.completedAt===op.baseCompletedAt&&
    typeof set.done==='boolean'&&set.done!==op.done&&
    ((set.done&&typeof set.completedAt==='string')||(!set.done&&set.completedAt===null)))
  return {status:'safe-to-retry'};
 if(!receipt||receipt.id!==op.id||receipt.sessionId!==op.sessionId||receipt.exerciseIndex!==op.exerciseIndex||receipt.setIndex!==op.setIndex||receipt.revisionBefore!==op.baseRevision||receipt.revisionAfter!==remote.revision||receipt.done!==set.done||receipt.completedAt!==set.completedAt)return {status:'manual-review'};
 return {status:'candidate-already-applied'};
}
