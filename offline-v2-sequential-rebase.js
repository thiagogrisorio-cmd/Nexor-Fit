/**
 * Conservative sequential rebase planner for multiple edits to one V2 exercise.
 * Never overwrites an exercise changed remotely since the first queued edit.
 * Caller must commit each edit and refresh revision before continuing.
 */
export function planV2SequentialRebase(operations,remote){
 if(!Array.isArray(operations)||!operations.length||!remote)throw Error('Reconciliação incompleta');
 const ordered=[...operations].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const first=ordered[0];
 if(ordered.some(op=>op.sessionId!==first.sessionId||op.exerciseIndex!==first.exerciseIndex||
  op.kind!=='v2-mark-set'||!Number.isInteger(op.setIndex)||op.setIndex<0||op.setIndex>1||
  typeof op.done!=='boolean))return {status:'conflict',reason:'invalid-group'};
 if(remote.sessionId!==first.sessionId||remote.index!==first.exerciseIndex||
  remote.revision!==first.baseRevision)return {status:'conflict',reason:'remote-revision-changed'};
 if(ordered.some(op=>op.baseRevision!==first.baseRevision))
  return {status:'conflict',reason:'mixed-base-revisions'};
 const expected=remote.sets?.[first.setIndex];
 if(!expected||expected.completedAt!==first.baseCompletedAt)
  return {status:'conflict',reason:'remote-set-changed'};
 const touched=new Set();
 for(const op of ordered){
  const key=op.setIndex;
  if(!remote.sets?.[key]||remote.sets[key].completedAt!==op.baseCompletedAt)
   return {status:'conflict',reason:'remote-set-changed'};
  if(touched.has(key))return {status:'manual-review',reason:'repeated-set-edit'};
  touched.add(key);
 }
 return {status:'ready',steps:ordered.map((op,i)=>({
  operationId:op.id,operation:op,expectedRevision:first.baseRevision+i,
  expectedCompletedAt:op.baseCompletedAt
 }))};
}
