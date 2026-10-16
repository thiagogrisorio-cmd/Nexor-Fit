import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {auth} from './auth.js';
import {createV2FirebaseSyncAdapter} from './offline-v2-firebase-adapter.js';
import {renderV2RecoveryStatus} from './offline-v2-recovery-view.js';
export function installV2RecoveryDiagnostics({target,enabled=false}={}){
 if(!enabled||!target)return ()=>{};
 let sequence=0;
 const refresh=async()=>{
  const generation=++sequence,uid=auth.currentUser?.uid;
  if(!uid){target.textContent='Diagnóstico V2: faça login.';return;}
  try{
   const db=getFirestore();
   const readRemoteExercise=async operation=>{
    if(auth.currentUser?.uid!==uid||!operation.id.startsWith(uid+':v2:'))throw Error('Conta alterada');
    return createV2FirebaseSyncAdapter({db,uid}).readRemoteExercise(operation);
   };
   const buffer={textContent:''};
   await renderV2RecoveryStatus({uid,readRemoteExercise,target:buffer});
   if(generation===sequence&&auth.currentUser?.uid===uid)target.textContent=buffer.textContent;
  }catch(error){if(generation===sequence)target.textContent='Diagnóstico V2 indisponível.';}
 };
 const unsubscribe=onAuthStateChanged(auth,refresh);
 const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
 document.addEventListener('visibilitychange',onVisible);
 return ()=>{sequence++;unsubscribe();document.removeEventListener('visibilitychange',onVisible);};
}
