import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {pendingOfflineSummary} from './offline-controller.js';
import {synchronizeOfflineWorkouts} from './offline-sync-worker.js';
export function initOfflineStatus(){
 const target=document.getElementById('offlineQueueStatus');
 if(!target)return;
 let generation=0;
 let lastConflict='';
 async function sync(){
  if(!navigator.onLine||!auth.currentUser)return;
  try{
   const result=await synchronizeOfflineWorkouts();
   lastConflict=result.conflicts?.some(item=>item.reason==='legacy-v1-writes-retired')
    ?'Sincronização V1 encerrada. Alterações antigas preservadas no dispositivo; recuperação manual necessária.'
    :result.conflicts?.length?result.conflicts.length+' sessão(ões) precisam de revisão':'';
   await refresh();
  }catch(error){console.warn('Nexor sync:',error);}
 }
 async function refresh(){
  const current=++generation;
  const scope=auth.currentUser?.uid||'guest';
  try{
   const summary=await pendingOfflineSummary(scope);
   if(current!==generation||scope!==(auth.currentUser?.uid||'guest'))return;
   const network=navigator.onLine?'Conexão disponível':'Sem conexão';
   target.textContent=summary.count
    ?network+' · '+summary.count+' alteração(ões) offline aguardando sincronização'
    :network+' · Nenhuma alteração offline pendente';
   if(lastConflict)target.textContent+=' · '+lastConflict;
  }catch(error){
   if(current===generation)target.textContent='Não foi possível consultar o armazenamento offline.';
   console.error('Nexor offline queue:',error);
  }
 }
 onAuthStateChanged(auth,()=>{lastConflict='';refresh();sync();});
 window.addEventListener('online',()=>{refresh();sync();});
 window.addEventListener('offline',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refresh();sync()}});
 window.addEventListener('nexor-offline-queue-changed',refresh);
 refresh();sync();
 return {refresh,sync};
}
