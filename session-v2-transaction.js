import {prepareV2SessionDocuments} from './session-exercise-schema-v2.js';

/**
 * Prepare all V2 documents in one Firestore transaction.
 * Caller provides transaction and document refs; no commit occurs here.
 * The session parent must be created before exercising V2 rules.
 */
export function stageV2SessionCreate(transaction,{session,sessionRef,exerciseRefs,serverTimestamp}){
 if(!transaction||!sessionRef||!Array.isArray(exerciseRefs)||exerciseRefs.length!==12)
  throw Error('Referências V2 incompletas');
 const {metadata,exercises}=prepareV2SessionDocuments(session);
 transaction.set(sessionRef,{...metadata,updatedAt:serverTimestamp()});
 exercises.forEach((exercise,index)=>{
  transaction.set(exerciseRefs[index],{...exercise,updatedAt:serverTimestamp()});
 });
 return {sessionId:session.id,exerciseCount:exercises.length};
}
