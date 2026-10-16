import {encodeSessionForFirestore,decodeSessionFromFirestore} from './firestore-session-codec.js';
// Firestore transaction worker for queued edits. Acknowledgement occurs ONLY after
// successful commit. Failed/conflicting operations remain in IndexedDB.
import {auth} from './auth.js';
import {getFirestore,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {pendingOfflineOperations} from './offline-controller.js';
import {removeOfflineOperation} from './offline-store.js';
import {planOfflineSync} from './offline-sync-plan.js';

const db=getFirestore();
let running=null;
const signal=()=>window.dispatchEvent(new Event('nexor-offline-queue-changed'));
export async function synchronizeOfflineWorkouts(){
 if(running)return running;
 running=runSync().finally(()=>{running=null;});
 return running;
}
async function runSync(){
 const account=auth.currentUser?.uid;
 if(!account||!navigator.onLine)return {status:'offline',synced:0,conflicts:[]};
 const queued=await pendingOfflineOperations(account);
 const groups=new Map();
 for(const op of queued){
  if(!groups.has(op.sessionId))groups.set(op.sessionId,[]);
  groups.get(op.sessionId).push(op);
 }
 let synced=0;
 const conflicts=[];
 for(const [sessionId,operations] of groups){
  if(auth.currentUser?.uid!==account)break;
  const sessionRef=doc(db,'users',account,'sessions',sessionId);
  const controlRef=doc(db,'users',account,'sessionControl','active');
  let outcome;
  try{
   outcome=await runTransaction(db,async tx=>{
    if(auth.currentUser?.uid!==account)throw Error('Conta alterada');
    const control=await tx.get(controlRef);
    const snapshot=await tx.get(sessionRef);
    if(!snapshot.exists())return {status:'conflict',reason:'missing-session'};
    const remote=decodeSessionFromFirestore(snapshot.data());
    const plan=planOfflineSync(remote,operations);
    if(plan.status==='ready'){
     const activeId=control.exists()?control.data().sessionId:'';
     if(activeId!==sessionId)return {status:'conflict',reason:'active-session-changed'};
     tx.set(sessionRef,{...encodeSessionForFirestore(plan.session),updatedAt:serverTimestamp()});
     tx.set(controlRef,{sessionId:plan.session.status==='active'?sessionId:'',updatedAt:serverTimestamp()});
    }
    return plan;
   });
   if(auth.currentUser?.uid!==account)break;
   if(outcome.status==='ready'||outcome.status==='already-applied'){
    for(const op of operations){
     // The snapshot's immutable operation IDs ensure newly queued edits are not removed.
     await removeOfflineOperation(op.id);
     synced++;
    }
    signal();
   }else if(outcome.status==='conflict')conflicts.push({sessionId,reason:outcome.reason});
  }catch(error){
   conflicts.push({sessionId,reason:'transaction-failed',message:error.message});
  }
 }
 signal();
 return {status:conflicts.length?'needs-review':'complete',synced,conflicts};
}
