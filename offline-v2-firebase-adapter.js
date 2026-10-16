import {getDoc,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {updateV2Set} from './session-v2-repository.js';

/** Browser-only Firebase adapter for opt-in V2 offline sync. */
export function createV2FirebaseSyncAdapter({db,uid}){
 if(!db||!uid)throw Error('Firebase V2 incompleto');
 return {
  async readRemoteExercise(operation){
   if(operation.sessionId==null)throw Error('Sessão ausente');
   const ref=doc(db,'users',uid,'sessions',operation.sessionId,'exercises',String(operation.exerciseIndex));
   const snapshot=await getDoc(ref);
   if(!snapshot.exists())throw Error('Exercício remoto ausente');
   return snapshot.data();
  },
  async updateRemoteSet(operation){
   return updateV2Set({
    db,uid,sessionId:operation.sessionId,exerciseIndex:operation.exerciseIndex,setIndex:operation.setIndex,
    done:operation.done,expectedRevision:operation.expectedRevision,expectedCompletedAt:operation.expectedCompletedAt,
    now:operation.at,runTransaction,doc,serverTimestamp
   });
  }
 };
}
