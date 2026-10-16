// Pure synchronization planning. A committed batch can be retried after a crash.
// Never acknowledge a batch unless its complete final effects match the server.
import {markSet,finishSession} from './workout-session.js';
import {replayOfflineOperations} from './offline-operations.js';
const orderedOps=operations=>[...operations].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
function effectsAlreadyApplied(remote,operations){
 const last=operations.at(-1);
 if(!last)return false;
 const finishes=operations.filter(op=>op.kind==='finish');
 if(finishes.length>1||finishes.some(op=>op!==last))return false;
 if(finishes.length){
  if(remote.status!=='completed'||remote.endedAt!==new Date(last.at).toISOString())return false;
 }else if(remote.status!=='active')return false;
 // The last write to each set determines its final state. Timestamp comparison
 // protects against acknowledging an unrelated device's edits.
 const finalSets=new Map();
 for(const op of operations)if(op.kind==='mark-set')finalSets.set(op.exercise+':'+op.set,op);
 for(const op of finalSets.values()){
  const actual=remote.sets?.[op.exercise]?.[op.set];
  if(!actual||actual.done!==op.done||
    actual.completedAt!==(op.done?new Date(op.at).toISOString():null))return false;
 }
 if(!finishes.length&&last.kind==='mark-set'){
  const expectedRest=last.done&&remote.restSeconds>0
   ?new Date(last.at+remote.restSeconds*1000).toISOString():null;
  if(remote.restUntil!==expectedRest)return false;
 }
 return true;
}
export function planOfflineSync(remote,operations){
 if(!remote||!remote.id)throw Error('Sessão remota não encontrada; revisão necessária');
 if(!Array.isArray(operations)||!operations.length)return {status:'empty',session:remote,operationIds:[]};
 const ordered=orderedOps(operations);
 if(ordered.some(op=>op.sessionId!==remote.id))return {status:'conflict',reason:'session-mismatch'};
 if(effectsAlreadyApplied(remote,ordered))
  return {status:'already-applied',session:remote,operationIds:ordered.map(op=>op.id)};
 if(remote.status==='completed')return {status:'conflict',reason:'remote-completed'};
 if(remote.status!=='active')return {status:'conflict',reason:'invalid-remote-state'};
 // A remote set completed on another device must never be overwritten silently.
 // Without a shared base revision, concurrent edits to the same set require review.
 for(const op of ordered){
  if(op.kind!=='mark-set')continue;
  const current=remote.sets?.[op.exercise]?.[op.set];
  if(!current)return {status:'conflict',reason:'invalid-set'};
  if(current.done||current.completedAt!==null){
   return {status:'conflict',reason:'concurrent-set-change'};
  }
 }
 try{
  const next=replayOfflineOperations(remote,ordered,{markSet,finishSession});
  return {status:'ready',session:next,operationIds:ordered.map(op=>op.id)};
 }catch(error){
  return {status:'conflict',reason:'invalid-operation',detail:error.message};
 }
}
