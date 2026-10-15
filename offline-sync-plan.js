// Pure sync planning: never discard local edits when remote state conflicts.
// The caller must commit the plan in a Firestore transaction before acknowledging queue entries.
import {markSet,finishSession} from './workout-session.js';
import {replayOfflineOperations} from './offline-operations.js';
export function planOfflineSync(remote,operations){
 if(!remote||!remote.id)throw Error('Sessão remota não encontrada; revisão necessária');
 if(!Array.isArray(operations)||!operations.length)return {status:'empty',session:remote,operationIds:[]};
 const ordered=[...operations].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 if(ordered.some(op=>op.sessionId!==remote.id))return {status:'conflict',reason:'session-mismatch'};
 // Completed sessions cannot be edited again. A matching finish is an idempotent retry.
 if(remote.status==='completed'){
  const finish=ordered.find(op=>op.kind==='finish');
  if(finish&&remote.endedAt===new Date(finish.at).toISOString()){
   return {status:'already-applied',session:remote,operationIds:ordered.map(op=>op.id)};
  }
  return {status:'conflict',reason:'remote-completed'};
 }
 if(remote.status!=='active')return {status:'conflict',reason:'invalid-remote-state'};
 try{
  const next=replayOfflineOperations(remote,ordered,{markSet,finishSession});
  return {status:'ready',session:next,operationIds:ordered.map(op=>op.id)};
 }catch(error){
  return {status:'conflict',reason:'invalid-operation',detail:error.message};
 }
}
