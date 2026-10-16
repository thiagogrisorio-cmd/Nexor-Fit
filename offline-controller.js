// Local-first session controller. No network access or Firebase side effects.
// The caller must provide a scope for the current user/device.
import {startSession,markSet,finishSession} from './workout-session.js';
import {makeOfflineOperation} from './offline-operations.js';
import {getOfflineSession,saveOfflineSession,persistOfflineMutation,listOfflineOperations} from './offline-store.js';
const scopedId=(scope,id)=>scope+':'+id;
export async function startOfflineWorkout({scope,day,restSeconds=90,now=Date.now(),id=crypto.randomUUID()}){
 if(!scope||typeof scope!=='string')throw Error('Escopo obrigatório');
 const session=startSession({day,restSeconds,now,id});
 await saveOfflineSession({...session,id:scopedId(scope,id),sessionId:id,scope});
 return session;
}
export async function changeOfflineWorkout({scope,sessionId,kind,exercise,set,done,now=Date.now(),operationId=crypto.randomUUID()}){
 if(!scope||!sessionId)throw Error('Escopo e sessão obrigatórios');
 const stored=await getOfflineSession(scopedId(scope,sessionId));
 if(!stored||stored.scope!==scope)throw Error('Sessão local não encontrada');
 const {scope:owner,sessionId:originalId,...storedSession}=stored;
 const session={...storedSession,id:originalId};
 if(session.status!=='active')throw Error('Sessão encerrada');
 const operation=makeOfflineOperation({id:scopedId(scope,operationId),sessionId,kind,exercise,set,done,at:now});
 const next=kind==='mark-set'?markSet(session,exercise,set,done,now):finishSession(session,now);
 await persistOfflineMutation({...next,id:scopedId(scope,sessionId),sessionId,scope},operation);
 return next;
}
export async function cacheOnlineWorkout(scope,session){
 if(!scope||!session?.id)throw Error('Escopo e sessão obrigatórios');
 const pending=await pendingOfflineOperations(scope);
 if(pending.some(op=>op.sessionId===session.id))return false;
 await saveOfflineSession({...session,id:scopedId(scope,session.id),sessionId:session.id,scope});
 return true;
}
export async function pendingOfflineSummary(scope){
 const operations=await pendingOfflineOperations(scope);
 const bySession={};
 for(const op of operations)bySession[op.sessionId]=(bySession[op.sessionId]||0)+1;
 return {count:operations.length,bySession};
}
export async function readOfflineWorkout(scope,sessionId){
 if(!scope||!sessionId)throw Error('Escopo e sessão obrigatórios');
 const stored=await getOfflineSession(scopedId(scope,sessionId));
 if(!stored||stored.scope!==scope)return null;
 const {scope:owner,sessionId:originalId,...data}=stored;
 return {...data,id:originalId};
}
export async function pendingOfflineOperations(scope){
 if(!scope)throw Error('Escopo obrigatório');
 const operations=await listOfflineOperations();
 return operations.filter(item=>item.id.startsWith(scope+':'));
}
