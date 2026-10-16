import {prepareV2SessionDocuments,joinSessionExercises} from './session-exercise-schema-v2.js';

/**
 * Transactional V2 creation, with active pointer check and 12 exercise writes.
 * Adapter receives Firebase SDK functions to avoid hard-coding a CDN import.
 * Not connected to the production session UI.
 */
export async function createV2Workout({db,uid,session,runTransaction,doc,serverTimestamp}){
 if(!uid||!session?.id||!db||!runTransaction||!doc||!serverTimestamp)
  throw Error('Parâmetros V2 incompletos');
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 const root=doc(db,'users',uid,'sessions',session.id);
 const control=doc(db,'users',uid,'sessionControl','active');
 const refs=exercises.map(row=>doc(db,'users',uid,'sessions',session.id,'exercises',String(row.index)));
 await runTransaction(db,async tx=>{
  const [pointer,existing]=await Promise.all([tx.get(control),tx.get(root)]);
  if(existing.exists())throw Error('Sessão já existe');
  if(pointer.exists()&&pointer.data().sessionId)throw Error('Outra sessão já está ativa');
  tx.set(root,{...metadata,updatedAt:serverTimestamp()});
  exercises.forEach((row,index)=>tx.set(refs[index],{...row,updatedAt:serverTimestamp()}));
  tx.set(control,{sessionId:session.id,updatedAt:serverTimestamp()});
 });
 return session.id;
}

/** Reassemble only complete V2 snapshots; reject missing exercise docs. */
export function readV2Workout(metadata,exerciseSnapshots){
 if(!metadata||metadata.schemaVersion!==2)throw Error('Metadados V2 inválidos');
 if(!Array.isArray(exerciseSnapshots)||exerciseSnapshots.length!==12)
  throw Error('Documentos de exercícios incompletos');
 const docs=exerciseSnapshots.map(s=>{
  if(!s.exists())throw Error('Exercício ausente');
  return s.data();
 });
 const {schemaVersion,updatedAt,...rest}=metadata;
 return joinSessionExercises(rest,docs);
}

/**
 * Change one V2 set using Firestore optimistic transaction retries.
 * The expectedCompletedAt token prevents silently overwriting a remote edit.
 */
export async function updateV2Set({db,uid,sessionId,exerciseIndex,setIndex,done,expectedCompletedAt,runTransaction,doc,serverTimestamp,now=Date.now()}){
 if(!uid||!sessionId||!db||!runTransaction||!doc||!serverTimestamp)throw Error('Parâmetros V2 incompletos');
 if(!Number.isInteger(exerciseIndex)||exerciseIndex<0||exerciseIndex>11)throw Error('Exercício inválido');
 if(!Number.isInteger(setIndex)||setIndex<0||setIndex>1)throw Error('Série inválida');
 if(typeof done!=='boolean')throw Error('Estado inválido');
 if(expectedCompletedAt!==null&&typeof expectedCompletedAt!=='string')throw Error('Versão esperada inválida');
 const root=doc(db,'users',uid,'sessions',sessionId);
 const exercise=doc(db,'users',uid,'sessions',sessionId,'exercises',String(exerciseIndex));
 return runTransaction(db,async tx=>{
  const [parent,record]=await Promise.all([tx.get(root),tx.get(exercise)]);
  if(!parent.exists()||parent.data().schemaVersion!==2||parent.data().status!=='active')throw Error('Sessão V2 não está ativa');
  if(!record.exists())throw Error('Exercício V2 ausente');
  const data=record.data();
  if(data.index!==exerciseIndex||data.sessionId!==sessionId||!Array.isArray(data.sets)||data.sets.length!==2)throw Error('Exercício V2 inválido');
  const current=data.sets[setIndex];
  if(!current||current.completedAt!==expectedCompletedAt)throw Error('Conflito: série alterada em outro aparelho');
  const sets=data.sets.map(item=>({...item}));
  sets[setIndex]={done,completedAt:done?new Date(now).toISOString():null};
  tx.update(exercise,{sets,updatedAt:serverTimestamp()});
  return sets[setIndex];
 });
}
