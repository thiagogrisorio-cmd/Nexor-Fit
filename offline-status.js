import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {pendingOfflineSummary} from './offline-controller.js';
export function initOfflineStatus(){
 const target=document.getElementById('offlineQueueStatus');
 if(!target)return;
 let generation=0;
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
  }catch(error){
   if(current===generation)target.textContent='Não foi possível consultar o armazenamento offline.';
   console.error('Nexor offline queue:',error);
  }
 }
 onAuthStateChanged(auth,refresh);
 window.addEventListener('online',refresh);
 window.addEventListener('offline',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
 window.addEventListener('nexor-offline-queue-changed',refresh);
 refresh();
 return {refresh};
}
