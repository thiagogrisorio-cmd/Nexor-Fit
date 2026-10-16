/**
 * V2 offline mutation preparation: each edit carries the exact revision read
 * before the local change. Replay is refused if the server revision moved.
 */
export function makeV2OfflineSetOperation({id,sessionId,exerciseIndex,setIndex,done,baseRevision,baseCompletedAt,at=Date.now()}){
 if(!id||!sessionId||!Number.isInteger(exerciseIndex)||exerciseIndex<0||exerciseIndex>11)
  throw Error('Identificador de exercício inválido');
 if(!Number.isInteger(setIndex)||setIndex<0||setIndex>1||typeof done!=='boolean')
  throw Error('Série inválida');
 if(!Number.isInteger(baseRevision)||baseRevision<0)throw Error('Revisão inválida');
 if(baseCompletedAt!==null&&typeof baseCompletedAt!=='string')throw Error('Versão inválida');
 if(!Number.isFinite(at)||at<0)throw Error('Data inválida');
 return {id,sessionId,kind:'v2-mark-set',exerciseIndex,setIndex,done,baseRevision,baseCompletedAt,at};
}
export function planV2OfflineSetReplay(operation,remoteExercise){
 if(operation?.kind!=='v2-mark-set'||!remoteExercise)throw Error('Operação V2 inválida');
 if(remoteExercise.index!==operation.exerciseIndex||remoteExercise.sessionId!==operation.sessionId)
  throw Error('Exercício remoto incorreto');
 if(remoteExercise.revision!==operation.baseRevision)
  return {status:'conflict',reason:'remote-revision-changed'};
 const current=remoteExercise.sets?.[operation.setIndex];
 if(!current||current.completedAt!==operation.baseCompletedAt)
  return {status:'conflict',reason:'remote-set-changed'};
 return {status:'ready',expectedRevision:operation.baseRevision,expectedCompletedAt:operation.baseCompletedAt};
}
