import {prepareV2SessionDocuments} from './session-exercise-schema-v2.js';

/**
 * Read-only migration preflight. Does not write or delete Firestore documents.
 * Accepts a decoded legacy session, preserving original set timestamps.
 */
export function planLegacySessionMigration(session,existingV2=null){
 if(!session||typeof session!=='object'||!session.id)throw Error('Sessão legada ausente');
 if(session.schemaVersion===2)return {status:'already-v2',sessionId:session.id};
 if(existingV2)return {status:'conflict',sessionId:session.id,reason:'target-exists'};
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 if(exercises.length!==12||exercises.some(e=>e.sets.length!==2))throw Error('Estrutura de séries inválida');
 return {
  status:'ready',sessionId:session.id,
  metadata,exercises,
  checks:{exerciseCount:exercises.length,setCount:exercises.reduce((n,e)=>n+e.sets.length,0),
   completedSets:exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0)}
 };
}
