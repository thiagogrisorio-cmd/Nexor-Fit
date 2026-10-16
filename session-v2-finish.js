/**
 * Complete a V2 workout only when its 12 exercise documents exist.
 * All reads precede writes. A concurrent set edit causes transaction retry.
 * This module is not yet wired to the live UI.
 */
export async function finishV2Workout({db,uid,sessionId,doc,runTransaction,serverTimestamp,now=Date.now()}){
 if(!db||!uid||!sessionId||!doc||!runTransaction||!serverTimestamp)throw Error('Conclusão V2 incompleta');
 if(!Number.isFinite(now)||now<0)throw Error('Data de conclusão inválida');
 const root=doc(db,'users',uid,'sessions',sessionId);
 const control=doc(db,'users',uid,'sessionControl','active');
 const children=Array.from({length:12},(_,i)=>doc(db,'users',uid,'sessions',sessionId,'exercises',String(i)));
 return runTransaction(db,async tx=>{
  const [parent,pointer,...exercises]=await Promise.all([tx.get(root),tx.get(control),...children.map(ref=>tx.get(ref))]);
  if(!parent.exists()||parent.data().schemaVersion!==2||parent.data().status!=='active')throw Error('Sessão V2 não está ativa');
  if(!pointer.exists()||pointer.data().sessionId!==sessionId)throw Error('Ponteiro ativo divergente');
  if(exercises.some((snap,i)=>!snap.exists()||snap.data().index!==i||snap.data().sessionId!==sessionId||
     !Array.isArray(snap.data().sets)||snap.data().sets.length!==2))throw Error('Exercícios V2 incompletos');
  const started=new Date(parent.data().startedAt).getTime();
  if(!Number.isFinite(started)||now<started)throw Error('Horário da sessão inválido');
  const endedAt=new Date(now).toISOString();
  const durationSeconds=Math.floor((now-started)/1000);
  tx.update(root,{status:'completed',endedAt,durationSeconds,restUntil:null,updatedAt:serverTimestamp()});
  tx.set(control,{sessionId:'',updatedAt:serverTimestamp()});
  return {sessionId,status:'completed',endedAt,durationSeconds};
 });
}
