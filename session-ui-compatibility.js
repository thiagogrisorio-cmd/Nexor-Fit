import {decodeSessionFromFirestore} from './firestore-session-codec.js';
import {joinSessionExercises} from './session-exercise-schema-v2.js';

/**
 * Pure, read-only compatibility boundary for the workout UI.
 * Rejects partial V2 data rather than falling back to stale V1 state.
 */
export function decodeWorkoutForUI({metadata,exerciseDocuments}){
 if(!metadata||typeof metadata!=='object'||!metadata.id)throw Error('Sessão ausente');
 if(metadata.schemaVersion===2){
  if(Object.hasOwn(metadata,'sets'))throw Error('Sessão V2 contém séries legadas');
  if(!Array.isArray(exerciseDocuments)||exerciseDocuments.length!==12)
   throw Error('Exercícios V2 ainda não carregados');
  const {schemaVersion,updatedAt,...rest}=metadata;
  const session=joinSessionExercises(rest,exerciseDocuments);
  return {format:'v2',session,readOnly:true};
 }
 if(Object.hasOwn(metadata,'schemaVersion'))throw Error('Versão de sessão desconhecida');
 const session=decodeSessionFromFirestore(metadata);
 if(session.sets.length!==12||session.sets.some(row=>row.length!==2||
   row.some(set=>typeof set?.done!=='boolean'||(set.completedAt!==null&&typeof set.completedAt!=='string'))))
  throw Error('Sessão V1 inválida');
 return {format:'v1',session,readOnly:false};
}
