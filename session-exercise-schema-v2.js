// Proposed v2 schema: one document per exercise, keeping the 12x2 model.
// This module does not modify production reads/writes until migration is ready.
const checkIndex=index=>{if(!Number.isInteger(index)||index<0||index>11)throw Error('Índice de exercício inválido');};
export function exerciseDocumentPath(uid,sessionId,index){
 if(!uid||!sessionId)throw Error('Usuário e sessão obrigatórios');
 checkIndex(index);
 return ['users',uid,'sessions',sessionId,'exercises',String(index)];
}
export function splitSessionExercises(session){
 if(!session?.id||!Array.isArray(session.sets)||session.sets.length!==12)
  throw Error('Sessão inválida');
 return session.sets.map((sets,index)=>{
  checkIndex(index);
  if(!Array.isArray(sets)||sets.length!==2||
     sets.some(s=>typeof s?.done!=='boolean'||(s.completedAt!==null&&typeof s.completedAt!=='string')))
   throw Error('Séries inválidas');
  return {index,sessionId:session.id,revision:0,sets:structuredClone(sets)};
 });
}
export function joinSessionExercises(metadata,documents){
 if(!metadata?.id||!Array.isArray(documents)||documents.length!==12)
  throw Error('Exercícios incompletos');
 const sets=Array(12);
 for(const doc of documents){
  checkIndex(doc.index);
  if(doc.sessionId!==metadata.id||sets[doc.index])throw Error('Exercício duplicado ou sessão incorreta');
  if(!Array.isArray(doc.sets)||doc.sets.length!==2||
     doc.sets.some(s=>typeof s?.done!=='boolean'||(s.completedAt!==null&&typeof s.completedAt!=='string')))
   throw Error('Séries inválidas');
  sets[doc.index]=structuredClone(doc.sets);
 }
 if(sets.some(row=>!row))throw Error('Exercícios incompletos');
 return {...metadata,sets};
}

/**
 * Convert a legacy V1 session into V2 metadata and twelve exercise payloads.
 * This is a pure preparation step: callers must persist the documents atomically.
 */
export function prepareV2SessionDocuments(session){
 const exercises=splitSessionExercises(session);
 const {sets,...metadata}=session;
 return {metadata:{...metadata,schemaVersion:2},exercises};
}
