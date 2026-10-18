import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {pendingOfflineSummary} from './offline-controller.js';
import {synchronizeOfflineWorkouts} from './offline-sync-worker.js';
import {buildLegacyV1RecoveryExport} from './offline-v1-recovery-export.js';
export function initOfflineStatus(){
 const target=document.getElementById('offlineQueueStatus');
 if(!target)return;
 let generation=0;
 let lastConflict='';
 const exportButton=document.createElement('button');
 exportButton.type='button';
 exportButton.textContent='Exportar recuperação V1';
 exportButton.hidden=true;
 exportButton.addEventListener('click',async()=>{
  const account=auth.currentUser?.uid;
  if(!account)return;
  exportButton.disabled=true;
  try{
   const data=await buildLegacyV1RecoveryExport({uid:account,currentUid:auth.currentUser?.uid});
   if(auth.currentUser?.uid!==account)throw Error('Conta alterada');
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);
   try{const link=document.createElement('a');link.href=url;link.download='nexor-fit-recuperacao-v1.json';link.click();}
   finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(error){console.error('Exportação V1:',error);target.textContent='Falha ao exportar recuperação V1. Dados locais preservados.';}
  finally{exportButton.disabled=false;}
 });
 target.insertAdjacentElement('afterend',exportButton);
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
    ?network+' · '+summary.count+' alteração(ões) V1 preservada(s), sem sincronização automática. Exporte o arquivo de recuperação antes de limpar os dados deste dispositivo.'
    :network+' · Nenhuma alteração offline V1 pendente';
   exportButton.hidden=!auth.currentUser||summary.count===0;
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
