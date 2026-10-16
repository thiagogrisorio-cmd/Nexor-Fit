import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {auth} from './auth.js';
import {installV2AuthSync} from './offline-v2-auth-bridge.js';
import {createV2FirebaseSyncAdapter} from './offline-v2-firebase-adapter.js';

/**
 * Explicit V2 startup function. Not imported by index.html.
 * Resolve the account on each remote operation to prevent cross-account writes.
 */
export function startV2OfflineIntegration({onResult=()=>{},onError=console.error}={}){
 const db=getFirestore();
 const forAccount=operation=>{
  const uid=auth.currentUser?.uid;
  if(!uid||!operation.id.startsWith(uid+':v2:'))throw Error('Conta alterada durante sincronização V2');
  return createV2FirebaseSyncAdapter({db,uid});
 };
 return installV2AuthSync({
  auth,
  onAuthStateChanged:asyncAuthListener,
  readRemoteExercise:operation=>forAccount(operation).readRemoteExercise(operation),
  updateRemoteSet:operation=>forAccount(operation).updateRemoteSet(operation),
  onResult,onError
 });
}
import {onAuthStateChanged as asyncAuthListener} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
