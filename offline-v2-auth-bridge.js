/**
 * Opt-in Firebase Auth lifecycle bridge for the V2 offline queue.
 * Does not modify the legacy V1 session UI or start automatically.
 */
import {resumeV2OfflineSync} from './offline-v2-resume.js';
export function installV2AuthSync({auth,onAuthStateChanged,readRemoteExercise,updateRemoteSet,onResult=()=>{},onError=console.error}){
 if(!auth||!onAuthStateChanged||!readRemoteExercise||!updateRemoteSet)
  throw Error('Dependências Firebase V2 incompletas');
 let currentUid=null,disposed=false;
 const online=()=>typeof navigator!=='undefined'&&navigator.onLine!==false;
 const isCurrentAccount=uid=>!disposed&&currentUid===uid&&auth.currentUser?.uid===uid;
 const run=()=>{
  if(!currentUid||!online()||disposed)return;
  const uid=currentUid;
  resumeV2OfflineSync({uid,isCurrentAccount,isOnline:online,readRemoteExercise,updateRemoteSet})
   .then(result=>{if(isCurrentAccount(uid))onResult(result);})
   .catch(error=>{if(isCurrentAccount(uid))onError(error);});
 };
 const unsubscribe=onAuthStateChanged(auth,user=>{currentUid=user?.uid||null;run();});
 if(typeof window!=='undefined'){
  window.addEventListener('online',run);
  document.addEventListener('visibilitychange',run);
 }
 return ()=>{
  disposed=true;currentUid=null;
  unsubscribe();
  if(typeof window!=='undefined'){
   window.removeEventListener('online',run);
   document.removeEventListener('visibilitychange',run);
  }
 };
}
