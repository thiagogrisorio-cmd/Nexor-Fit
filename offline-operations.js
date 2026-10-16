// Pure offline operation model. Persist records in IndexedDB before applying them.
export function makeOfflineOperation({id,sessionId,kind,exercise=null,set=null,done=null,at=Date.now()}){
 if(typeof id!=='string'||!id||typeof sessionId!=='string'||!sessionId)throw Error('Identificador inválido');
 if(!['mark-set','finish'].includes(kind))throw Error('Operação inválida');
 if(!Number.isFinite(at)||at<0)throw Error('Data inválida');
 if(kind==='mark-set'&&(!Number.isInteger(exercise)||exercise<0||!Number.isInteger(set)||set<0||typeof done!=='boolean'))throw Error('Série inválida');
 return {id,sessionId,kind,exercise:kind==='mark-set'?exercise:null,set:kind==='mark-set'?set:null,done:kind==='mark-set'?done:null,at};
}
export function replayOfflineOperations(session,operations,{markSet,finishSession}){
 let next=session;
 const seen=new Set();
 const ordered=[...operations].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 for(const op of ordered){
  if(seen.has(op.id))continue;
  seen.add(op.id);
  if(op.sessionId!==next.id)throw Error('Operação de outra sessão');
  if(next.status!=='active')throw Error('Sessão encerrada; revisão necessária');
  next=op.kind==='mark-set'?markSet(next,op.exercise,op.set,op.done,op.at):finishSession(next,op.at);
 }
 return next;
}
