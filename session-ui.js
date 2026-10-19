import {encodeSessionForFirestore,decodeSessionFromFirestore} from './firestore-session-codec.js';
import {loadWorkoutForUI} from './session-ui-loader.js';
import {listPendingV2Edits,queueV2SetEdit} from './offline-v2-queue.js';
import {canUseV2WorkoutPilot} from './workout-v2-rollout-policy.js';
import {createV2Workout,updateV2Set} from './session-v2-repository.js';
import {finishV2Workout} from './session-v2-finish.js';
import {loadV2Summary} from './session-v2-summary-reader.js';
import {migrateLegacySessionAtomically} from './session-v2-migration-transaction.js';
import {startSession,markSet,finishSession,sessionProgress,remainingRest} from './workout-session.js';
import {auth} from './auth.js';
import {cacheOnlineWorkout,readOfflineWorkout,changeOfflineWorkout,pendingOfflineOperations} from './offline-controller.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocs,collection,query,orderBy,limit,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const db=getFirestore();
let loadGeneration=0;
let stopControlListener=null, stopSessionListener=null;
let observedSessionId='';
let v2Notice='';
let v2ReadOnly=false;
let v2LoadToken=0;
let v2PendingCount=0;
let legacySnapshotReloadInFlight=false;
const v2ExerciseBaselines=new Map();
const v2BaselineKey=(account,id,index)=>account+':'+id+':'+index;
async function primeV2OfflineBaselines(account,id){
 if(!navigator.onLine)return;
 const rows=await Promise.all(Array.from({length:12},(_,index)=>getDoc(doc(db,'users',account,'sessions',id,'exercises',String(index)))));
 if(uid!==account||auth.currentUser?.uid!==account||session?.id!==id)return;
 // Replace the entire snapshot: a missing or malformed row must never retain an older revision.
 for(let index=0;index<12;index++)v2ExerciseBaselines.delete(v2BaselineKey(account,id,index));
 for(let index=0;index<12;index++){
  const snap=rows[index],row=snap.exists()?snap.data():null;
  if(row?.index!==index||row?.sessionId!==id||!Number.isInteger(row.revision)||row.revision<0||!Array.isArray(row.sets)||row.sets.length!==2)continue;
  v2ExerciseBaselines.set(v2BaselineKey(account,id,index),{revision:row.revision,sets:row.sets.map(set=>({...set}))});
 }
}
async function queueOfflineV2PilotSet(exerciseIndex,setIndex){
 const account=uid,id=session?.id;
 if(!v2PilotEnabledOffline()||!v2ReadOnly||!account||auth.currentUser?.uid!==account||!id||navigator.onLine)throw Error('Edição V2 offline indisponível');
 const baseline=v2ExerciseBaselines.get(v2BaselineKey(account,id,exerciseIndex));
 const set=baseline?.sets?.[setIndex];
 if(!baseline||!set||typeof set.done!=='boolean'||(set.completedAt!==null&&typeof set.completedAt!=='string'))throw Error('Abra este treino online antes de editar offline');
 const pending=await listPendingV2Edits(account);
 if(pending.some(item=>item.sessionId===id&&item.exerciseIndex===exerciseIndex))throw Error('Há edição pendente neste exercício; sincronize antes de continuar');
 if(uid!==account||auth.currentUser?.uid!==account||session?.id!==id||navigator.onLine)throw Error('Conta, sessão ou conectividade alterada durante a edição');
 const desired=!session.sets[exerciseIndex][setIndex].done;
 await queueV2SetEdit({uid:account,id:globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+exerciseIndex+'-'+setIndex,sessionId:id,exerciseIndex,setIndex,done:desired,baseRevision:baseline.revision,baseCompletedAt:set.completedAt});
 if(uid!==account||auth.currentUser?.uid!==account||session?.id!==id)return;
 session={...session,sets:session.sets.map((row,i)=>i===exerciseIndex?row.map((value,j)=>j===setIndex?{...value,done:desired}:value):row)};
 window.dispatchEvent(new Event('nexor-v2-queue-changed'));
 render();
}

async function refreshV2PendingCount(){
 const account=uid;
 if(!account){v2PendingCount=0;render();return;}
 try{
  const edits=await listPendingV2Edits(account);
  if(uid!==account||auth.currentUser?.uid!==account)return;
  v2PendingCount=edits.length;
  render();
 }catch(error){console.warn('Nexor V2 pending status:',error);}
}
const v2PilotRequested=()=>true; // V2-only write boundary; legacy sessions remain readable.
const v2PilotEnabledOffline=()=>!!uid&&uid===auth.currentUser?.uid;
const v2PilotEnabled=()=>canUseV2WorkoutPilot({search:'?nexorV2StartPilot=1',uid,currentUid:auth.currentUser?.uid,online:navigator.onLine});
async function editV2PilotSet(exerciseIndex,setIndex){
 if(!v2PilotEnabled()||!v2ReadOnly||!uid||auth.currentUser?.uid!==uid||!navigator.onLine||!session?.id)throw Error('Edição V2 indisponível');
 const account=uid,id=session.id;
 const ref=doc(db,'users',account,'sessions',id,'exercises',String(exerciseIndex));
 const snapshot=await getDoc(ref);
 if(!snapshot.exists()||snapshot.data().index!==exerciseIndex||snapshot.data().sessionId!==id)throw Error('Exercício V2 inválido');
 const pending=await listPendingV2Edits(account);
 if(pending.some(item=>item.sessionId===id&&item.exerciseIndex===exerciseIndex))throw Error('Sincronize as alterações pendentes antes de editar online');
 const row=snapshot.data(),set=row.sets?.[setIndex];
 if(!set||typeof set.done!=='boolean')throw Error('Série V2 inválida');
 if(account!==auth.currentUser?.uid||session?.id!==id)throw Error('Sessão alterada');
 await updateV2Set({db,uid:account,sessionId:id,exerciseIndex,setIndex,done:!set.done,expectedRevision:row.revision,expectedCompletedAt:set.completedAt,runTransaction,doc,serverTimestamp});
 // The old revision cannot authorize an offline edit after this online write.
 v2ExerciseBaselines.delete(v2BaselineKey(account,id,exerciseIndex));

}

function stopLiveListeners(){
 v2LoadToken++;
 if(stopControlListener){stopControlListener();stopControlListener=null;}
 if(stopSessionListener){stopSessionListener();stopSessionListener=null;}
 observedSessionId='';
}
function watchSession(accountUid,id){
 if(observedSessionId===id)return;
 v2LoadToken++;
 if(stopSessionListener){stopSessionListener();stopSessionListener=null;}
 observedSessionId=id;
 if(!id){
  if(!saving)pendingOfflineOperations(accountUid).then(pending=>{
   if(uid!==accountUid||saving||auth.currentUser?.uid!==accountUid)return;
   if(session?.id&&pending.some(op=>op.sessionId===session.id))return;
   session=null;render();
  }).catch(console.warn);
  return;
 }
 stopSessionListener=onSnapshot(doc(db,'users',accountUid,'sessions',id),snapshot=>{
  if(uid!==accountUid||auth.currentUser?.uid!==accountUid||saving||snapshot.metadata.hasPendingWrites)return;
  pendingOfflineOperations(accountUid).then(pending=>{
   if(uid!==accountUid||auth.currentUser?.uid!==accountUid||observedSessionId!==id||saving)return;
   if(pending.some(item=>item.sessionId===id))return;
   listPendingV2Edits(accountUid).then(v2Pending=>{
    if(uid!==accountUid||auth.currentUser?.uid!==accountUid||observedSessionId!==id||saving)return;
    if(v2Pending.some(item=>item.sessionId===id))return;
    applyRemoteSession(snapshot,accountUid);
   }).catch(console.warn);
  }).catch(console.warn);
 },error=>console.error('Nexor live session:',error));
}
function applyRemoteSession(snapshot,accountUid){
 if(uid!==accountUid||auth.currentUser?.uid!==accountUid||saving)return;
 // A legacy live snapshot must pass through the guarded migration loader.
 // Never present an active V1 document as editable or overwrite V2 state.
 if(snapshot.exists()&&snapshot.data().schemaVersion!==2){
  v2ReadOnly=false;
  v2Notice='Treino legado detectado. Migração V2 necessária antes de editar.';
  session=null;
  render();
  if(navigator.onLine&&!legacySnapshotReloadInFlight){
   legacySnapshotReloadInFlight=true;
   load().catch(error=>console.warn('Nexor V1 migration load:',error))
    .finally(()=>{legacySnapshotReloadInFlight=false;});
  }
  return;
 }
  if(snapshot.exists()&&snapshot.data().schemaVersion===2){
  v2ReadOnly=true;
  // Preserve the queued local preview; the listener already suppresses snapshots with pending V2 edits.
  // Existing controls remain blocked until a complete revalidation is available.
  const previousV2Session=session?.id===snapshot.id&&v2ReadOnly?session:null;
  session=null;
  v2Notice='Treino V2 detectado. Carregando exercícios em modo somente leitura.';
  render();
  const token=++v2LoadToken;
  loadWorkoutForUI({db,uid:accountUid,sessionId:snapshot.id,doc,getDoc}).then(async result=>{
   if(token!==v2LoadToken||uid!==accountUid||auth.currentUser?.uid!==accountUid||observedSessionId!==snapshot.id)return;
   v2Notice=result.status!=='ready'?'Treino V2 incompleto ou indisponível. Nenhuma alteração foi realizada.':v2PilotEnabledOffline()?(navigator.onLine?'Treino V2 pronto para edição.':'Treino V2 offline: edições exigem revisões previamente carregadas.'):'Treino V2 disponível para leitura. Edição requer piloto autorizado.';
   const pendingV2=await listPendingV2Edits(accountUid);
   if(token!==v2LoadToken||uid!==accountUid||auth.currentUser?.uid!==accountUid||observedSessionId!==snapshot.id)return;
   if(pendingV2.some(item=>item.sessionId===snapshot.id)){
    v2PendingCount=pendingV2.length;
    v2Notice='Alterações V2 locais pendentes. Aguarde a sincronização antes de atualizar os dados remotos.';
    // Keep the queued local preview, but prevent another edit until sync completes.
    session=previousV2Session;
    render();return;
   }
   session=result.status==='ready'&&result.session.status==='active'?result.session:null;
   if(session&&v2PilotEnabled())primeV2OfflineBaselines(accountUid,snapshot.id).catch(console.warn);
   render();
  }).catch(error=>{if(token!==v2LoadToken||uid!==accountUid)return;console.error('Nexor V2:',error);v2Notice='Não foi possível carregar o treino V2 com segurança.';render();});
  return;
 }
 v2ReadOnly=false;v2Notice='';
 const remote=snapshot.exists()?decodeSessionFromFirestore(snapshot.data()):null;
  session=remote?.status==='active'?remote:null;
  if(remote?.status==='completed')completedSessions=[remote,...completedSessions.filter(item=>item.id!==remote.id)];
  render();
}
function watchControl(accountUid){
 stopLiveListeners();
 if(!accountUid)return;
 stopControlListener=onSnapshot(doc(db,'users',accountUid,'sessionControl','active'),snapshot=>{
  if(uid!==accountUid||auth.currentUser?.uid!==accountUid||snapshot.metadata.hasPendingWrites)return;
  const id=snapshot.exists()?snapshot.data().sessionId:'';
  watchSession(accountUid,id);
  if(!id&&!saving&&session?.status==='active')pendingOfflineOperations(accountUid).then(pending=>{
   if(uid===accountUid&&!saving&&!pending.some(op=>op.sessionId===session?.id))load();
  }).catch(console.warn);
 },error=>console.error('Nexor live control:',error));
}

const key='nexor_fit_active_session_v1',historyKey='nexor_fit_sessions_v1';
const $=id=>document.getElementById(id);
let session=null, saving=false, ready=false, uid=null, completedSessions=[];
let renderedSetKey='',renderedHistoryKey='';
let offlineSaving=false;
const activeCacheKey=account=>'nexor_fit_offline_active_'+account;
const notifyQueue=()=>window.dispatchEvent(new Event('nexor-offline-queue-changed'));
async function offlineEdit(kind,exercise,set,done){
 if(v2ReadOnly||v2PilotRequested())throw Error('Gravação V1 bloqueada no piloto V2; migração necessária');
 const account=auth.currentUser?.uid;
 if(!account||!session?.id)throw Error('Sessão offline indisponível');
 const pending=await pendingOfflineOperations(account);
 if(navigator.onLine&&!pending.some(item=>item.sessionId===session.id))return false;
 if(offlineSaving)throw Error('Alteração local em andamento');
 offlineSaving=true;render();
 let next;
 try{next=await changeOfflineWorkout({scope:account,sessionId:session.id,kind,exercise,set,done});}
 finally{offlineSaving=false;render();}
 session=next;
 if(next.status==='completed')completedSessions=[next,...completedSessions.filter(item=>item.id!==next.id)];
 notifyQueue();render();
 return true;
}

const local=()=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
const fmt=seconds=>[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
const restfmt=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
async function save(next, operation=null){
 if(v2ReadOnly||v2PilotRequested())throw Error('Gravação V1 bloqueada no piloto V2; migração necessária');
 if(saving)throw Error('Aguarde a gravação anterior');
 const accountAtStart=uid;
 saving=true;render();
 try{
  if(accountAtStart){
   const pending=await pendingOfflineOperations(accountAtStart);
   if(pending.some(item=>item.sessionId===next.id))throw Error('Há alterações offline pendentes; sincronização necessária');
   const ref=doc(db,'users',accountAtStart,'sessions',next.id);
   const controlRef=doc(db,'users',accountAtStart,'sessionControl','active');
   const accountUid=accountAtStart;
   await runTransaction(db,async tx=>{
     const control=await tx.get(controlRef);
     const currentId=control.exists()?control.data().sessionId:'';
     const stored=await tx.get(ref);
     if(next.status==='active' && !stored.exists() && currentId)throw Error('Outra sessão já está ativa');
     if(stored.exists() && stored.data().status==='completed')throw Error('Sessão já concluída');
     if(stored.exists() && currentId!==next.id)throw Error('Sessão modificada em outro aparelho');
     if(operation && !stored.exists())throw Error('Sessão não encontrada');
     if(accountUid!==auth.currentUser?.uid)throw Error('Conta alterada durante a gravação');
     const result=operation?operation(decodeSessionFromFirestore(stored.data())):next;
     tx.set(ref,{...encodeSessionForFirestore(result),updatedAt:serverTimestamp()});
     tx.set(controlRef,{sessionId:result.status==='active'?result.id:'',updatedAt:serverTimestamp()});
   });
   if(accountAtStart!==auth.currentUser?.uid)throw Error('Conta alterada durante a gravação');
   const saved=await getDoc(ref);
   if(!saved.exists())throw Error('Sessão não encontrada após gravação');
   next=decodeSessionFromFirestore(saved.data());
   await cacheOnlineWorkout(accountAtStart,next).then(()=>localStorage.setItem(activeCacheKey(accountAtStart),next.status==='active'?next.id:'')).catch(error=>console.warn('Offline cache:',error));
  }else{
   if(operation)next=operation(session);
   localStorage.setItem(key,JSON.stringify(next.status==='active'?next:null));
   if(next.status==='completed'){const history=JSON.parse(localStorage.getItem(historyKey)||'[]');history.push(next);localStorage.setItem(historyKey,JSON.stringify(history));}
  }
  if(accountAtStart!==auth.currentUser?.uid)throw Error('Conta alterada durante a gravação');
  session=next;
  if(next.status==='completed')completedSessions=[next,...completedSessions.filter(item=>item.id!==next.id)];
 }catch(error){if(accountAtStart===auth.currentUser?.uid)await load();throw error;}finally{saving=false;render();}
}
async function load(){
 // A focus/visibility reload while offline must not discard the hydrated V2 session.
 // Keep the authenticated in-memory view; never treat it as a fresh server baseline.
 if(!navigator.onLine&&v2ReadOnly&&session?.status==='active'&&uid&&uid===auth.currentUser?.uid){
  v2Notice='Treino V2 offline. Edições exigem revisões previamente carregadas; sincronize ao reconectar.';
  render();return;
 }
 // Keep the local V2 preview visible while queued edits await reconnection.
 if(v2ReadOnly&&session?.status==='active'&&uid&&uid===auth.currentUser?.uid){
  const pending=await listPendingV2Edits(uid).catch(()=>[]);
  if(pending.some(item=>item.sessionId===session.id)){
   v2PendingCount=pending.length;
   v2Notice='Alterações V2 aguardando sincronização. Não atualize ou conclua este treino até confirmar o envio.';
   render();return;
  }
 }
 const generation=++loadGeneration;
 uid=auth.currentUser?.uid||null;const accountUid=uid;ready=false;session=null;completedSessions=[];v2Notice='';v2ReadOnly=false;render();
 let loadedSession=null,loadedHistory=[];
 try{
  if(uid){
   const control=await getDoc(doc(db,'users',uid,'sessionControl','active'));
   const id=control.exists()?control.data().sessionId:'';
   if(id){
    let result=await loadWorkoutForUI({db,uid:accountUid,sessionId:id,doc,getDoc});
    if(result.format==='v1'&&result.status==='ready'&&result.session?.status==='active'&&navigator.onLine&&accountUid===auth.currentUser?.uid){
     const pendingLegacy=await pendingOfflineOperations(accountUid);
     if(!pendingLegacy.some(item=>item.sessionId===id)){
      try{
       const migration=await migrateLegacySessionAtomically({db,uid:accountUid,sessionId:id,doc,runTransaction,serverTimestamp});
       if(migration.status==='migrated'||migration.status==='already-v2')
        result=await loadWorkoutForUI({db,uid:accountUid,sessionId:id,doc,getDoc});
       else v2Notice='Treino legado preservado. Migração pendente: '+migration.status+'.';
      }catch(error){
       console.warn('Nexor V1 migration:',error);
       v2Notice='Treino legado preservado. Não foi possível migrar; reconecte e tente novamente.';
      }
     }else v2Notice='Treino legado com alterações offline V1 pendentes. Reenvio V1 desativado por segurança; dados locais preservados para recuperação. Migração automática bloqueada.';
    }
    if(result.format==='v2'||result.status==='incomplete'){
     v2ReadOnly=true;
     v2Notice=result.status==='ready'?'Treino V2 pronto para edição.':'Treino V2 incompleto. Edição bloqueada.';
    }
    loadedSession=result.status==='ready'?result.session:null;
   }
   const rows=await getDocs(query(collection(db,'users',uid,'sessions'),orderBy('startedAt','desc'),limit(50)));
   loadedHistory=rows.docs.filter(row=>row.data().schemaVersion!==2).map(row=>decodeSessionFromFirestore(row.data())).filter(item=>item.status==='completed');
   {
    // V2 history remains visible without the pilot flag; this is read-only.
    for(const row of rows.docs.filter(item=>item.data().schemaVersion===2&&item.data().status==='completed')){
     const item=row.data();
     loadedHistory.push({id:row.id,day:item.day,status:item.status,startedAt:item.startedAt,endedAt:item.endedAt,durationSeconds:item.durationSeconds,completedSets:Number.isInteger(item.completedSets)?item.completedSets:null,schemaVersion:2,sets:[]});
    }
    loadedHistory.sort((a,b)=>String(b.endedAt||'').localeCompare(String(a.endedAt||'')));
    // Bound summary reads to the five newest V2 workouts; never hydrate exercise documents for history.
    const recentV2=loadedHistory.filter(item=>item.schemaVersion===2).slice(0,5);
    await Promise.all(recentV2.map(async item=>{
     try{
      const summary=await loadV2Summary({db,uid:accountUid,sessionId:item.id,doc,getDoc});
      if(summary)item.completedSets=summary.completedSets;
     }catch(error){console.warn('Resumo V2 indisponível:',error);}
    }));
   }
  }else {loadedSession=local();loadedHistory=JSON.parse(localStorage.getItem(historyKey)||'[]').slice(-50).reverse();}
  if(generation!==loadGeneration||accountUid!==uid||saving)return;
  session=loadedSession;completedSessions=loadedHistory;
  if(accountUid&&!v2ReadOnly){
   const cachedId=localStorage.getItem(activeCacheKey(accountUid));
   const pending=await pendingOfflineOperations(accountUid);
   if(cachedId&&pending.some(item=>item.sessionId===cachedId)){
    const cached=await readOfflineWorkout(accountUid,cachedId);
    if(cached)session=cached.status==='active'?cached:null;
    if(cached?.status==='completed')completedSessions=[cached,...completedSessions.filter(item=>item.id!==cached.id)];
   }else if(!navigator.onLine&&cachedId){
    const cached=await readOfflineWorkout(accountUid,cachedId);
    if(cached?.status==='active')session=cached;
   }
  }
  if(generation!==loadGeneration||accountUid!==uid||saving)return;
  if(accountUid&&session?.status==='active'&&v2ReadOnly&&v2PilotEnabled()){
   await primeV2OfflineBaselines(accountUid,session.id).catch(error=>console.warn('Nexor V2 offline baseline:',error));
  }
  if(accountUid&&session?.status==='active'&&!v2ReadOnly)await cacheOnlineWorkout(accountUid,session).then(()=>localStorage.setItem(activeCacheKey(accountUid),session.id)).catch(console.warn);
  ready=true;
 }catch(error){if(generation!==loadGeneration)return;ready=false;console.error('Nexor session:',error);$('sessionMessage').textContent='Não foi possível carregar a sessão. Verifique a conexão.';}
 render();
}
function workoutExerciseLabel(day,index){
 const raw=window.nexorWorkoutDays?.[day]?.[2]?.[index];
 if(typeof raw!=='string')return 'Exercício '+(index+1);
 const [group,name,reps]=raw.split('|');
 return {group,name,reps};
}
function latestCompletedSetAt(current){
 const stamps=current.sets.flat().filter(set=>set.done&&typeof set.completedAt==='string').map(set=>Date.parse(set.completedAt)).filter(Number.isFinite);
 return stamps.length?Math.max(...stamps):null;
}
function render(){
 const panel=$('sessionPanel');if(!panel)return;
 const history=$('sessionHistory');
 const historyKeyView=JSON.stringify(completedSessions.map(item=>[item.id,item.status,item.endedAt,item.completedSets]));
 if(history && renderedHistoryKey!==historyKeyView){renderedHistoryKey=historyKeyView;history.innerHTML=completedSessions.slice(0,20).map(item=>'<div class="log"><b>Treino '+String.fromCharCode(65+item.day)+'</b> · '+new Date(item.endedAt).toLocaleString('pt-BR')+' · '+fmt(item.durationSeconds||0)+' · '+(Number.isInteger(item.completedSets)?item.completedSets:(item.schemaVersion===2?'—':sessionProgress(item).done))+' séries</div>').join('')||'<small>Nenhuma sessão cronometrada concluída.</small>';}
 const current=session?.status==='active'&&session.day===window.nexorActiveDay?.();
 panel.classList.toggle('hidden',!current);
 $('sessionStartPanel').classList.toggle('hidden',!!current);
 if(session?.status==='active'&&!current)$('sessionMessage').textContent='Há um treino em andamento. Abra o Treino '+String.fromCharCode(65+session.day)+' para continuar.';
 else $('sessionMessage').textContent=v2Notice+(v2PendingCount?' '+v2PendingCount+' alteração(ões) V2 aguardando sincronização.':'');
 $('sessionStartPanel').querySelector('button').disabled=!ready||saving||v2ReadOnly||session?.status==='active';
 if(!current)return;
 const p=sessionProgress(session), elapsed=Math.max(0,Math.floor((Date.now()-Date.parse(session.startedAt))/1000));
 $('sessionElapsed').textContent=fmt(elapsed);$('sessionSets').textContent=p.done+' de '+p.total+' séries ('+p.percent+'%)';
 // Rest belongs to the exercise whose set was marked done, not to the whole workout.
 $('sessionRest').textContent='O descanso de cada exercício aparece no próprio cartão.';
 const legacyBlocked=!v2ReadOnly&&v2PilotRequested();
 const pilotEdit=v2ReadOnly&&v2PendingCount===0&&v2PilotEnabledOffline()&&!!uid&&(navigator.onLine||session.sets.some((_,i)=>v2ExerciseBaselines.has(v2BaselineKey(uid,session.id,i))));
 const offlineBaselineIndexes=v2ReadOnly&&uid?session.sets.map((_,i)=>v2ExerciseBaselines.has(v2BaselineKey(uid,session.id,i))):[];
 const setKey=JSON.stringify([session.id,session.sets,saving,offlineSaving,v2ReadOnly,pilotEdit,legacyBlocked,v2PendingCount,navigator.onLine,offlineBaselineIndexes]);
 if(renderedSetKey!==setKey){
  renderedSetKey=setKey;
  const exercises=session.sets.map((sets,i)=>({sets,i,complete:sets.every(set=>set.done)}));
  const buildExercise=({sets,i,complete})=>{
   const details=workoutExerciseLabel(session.day,i);
   const title=typeof details==='string'?details:details.name;
   const subtitle=typeof details==='string'?'':details.group+' · '+sets.length+' séries · '+details.reps+' repetições';
   const safe=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[char]));
   return '<article class="session-exercise '+(complete?'is-complete':'')+'"><div class="row"><div><small class="tag">'+(complete?'CONCLUÍDO':'EXERCÍCIO '+(i+1))+'</small><h3>'+safe(title)+'</h3><small>'+safe(subtitle)+'</small></div><strong class="percent">'+sets.filter(set=>set.done).length+'/'+sets.length+'</strong></div><div class="session-exercise-sets">'+sets.map((set,j)=>'<button type="button" class="btn small '+(set.done?'':'outline')+'" data-set="'+i+'-'+j+'" '+(saving||offlineSaving||((v2ReadOnly&&(!pilotEdit||(!navigator.onLine&&!v2ExerciseBaselines.has(v2BaselineKey(uid,session.id,i)))))||legacyBlocked)?'disabled':'')+' aria-pressed="'+set.done+'">Série '+(j+1)+' · '+(set.done?'Feito ✓':'Marcar feito')+'</button>').join('')+'</div><p class="exercise-rest" data-rest-exercise="'+i+'" role="timer" aria-label="Descanso do exercício" hidden></p></article>';
  };
  const pending=exercises.filter(row=>!row.complete),done=exercises.filter(row=>row.complete);
  $('sessionSetList').innerHTML='<h3>Exercícios em andamento ('+pending.length+')</h3>'+pending.map(buildExercise).join('')+(done.length?'<h3 class="section">Exercícios concluídos ('+done.length+')</h3>'+done.map(buildExercise).join(''):'');
 }
 // Update only countdown text every second; never recreate buttons while the user interacts.
 $('sessionSetList').querySelectorAll('[data-rest-exercise]').forEach(target=>{
  const index=Number(target.dataset.restExercise);
  const sets=session.sets[index];
  const last=sets&&!sets.every(set=>set.done)?sets.filter(set=>set.done&&typeof set.completedAt==='string').map(set=>Date.parse(set.completedAt)).filter(Number.isFinite):[];
  const seconds=last.length?Math.max(0,Math.ceil((Math.max(...last)+session.restSeconds*1000-Date.now())/1000)):0;
  target.hidden=seconds===0;
  target.textContent=seconds?'Descanso deste exercício: '+restfmt(seconds):'';
 });
 $('finishSession').disabled=saving||offlineSaving||(v2ReadOnly&&!(v2PilotEnabled()&&!!uid&&navigator.onLine&&v2PendingCount===0))||legacyBlocked;
}
export function initSessionUI(getDay){
 window.nexorActiveDay=getDay;
 $('startSession').onclick=async()=>{
  if(!ready||saving||v2ReadOnly)return;
  if(session?.status==='active'){alert('Conclua seu treino em andamento antes de iniciar outro.');return;}
  const minutes=Number($('restMinutes').value);
  if(!Number.isFinite(minutes)||minutes<0||minutes>10){alert('Escolha entre 0 e 10 minutos.');return;}
  try{
   const next=startSession({day:getDay(),restSeconds:Math.round(minutes*60)});
   const pilotRequested=v2PilotRequested();
   const pilot=v2PilotEnabled();
   if(pilotRequested&&!pilot){alert('Piloto V2 indisponível sem conexão ou autenticação válida. Nenhuma sessão V1 será criada.');return;}
   if(pilot&&uid&&auth.currentUser?.uid===uid){
    saving=true;render();
    try{
     await createV2Workout({db,uid,session:next,runTransaction,doc,serverTimestamp});
    }finally{saving=false;render();}
    await load();
   }else throw Error('Início V1 desativado; faça login e conecte-se para iniciar V2');
  }catch(e){console.error('Nexor start:',e);$('sessionMessage').textContent='Falha ao iniciar sessão V2: '+(e?.code||e?.message||'erro desconhecido')+'. Consulte o console (F12) para detalhes.';alert('Não foi possível iniciar o treino V2. Veja o diagnóstico abaixo do botão.');}
 };
 $('sessionSetList').onclick=async event=>{
  const button=event.target.closest('[data-set]');if(!button||saving||offlineSaving)return;
  const [i,j]=button.dataset.set.split('-').map(Number);
  if(!v2ReadOnly&&v2PilotRequested()){alert('Treino V1 preservado para leitura. Migração para V2 necessária antes de editar.');return;}
  if(v2ReadOnly){const wasOffline=!navigator.onLine;try{saving=true;render();if(wasOffline)await queueOfflineV2PilotSet(i,j);else await editV2PilotSet(i,j);}catch(e){console.error('V2 set:',e);alert('Não foi possível atualizar a série V2. Abra o treino online antes de editar offline ou sincronize as pendências.');}finally{saving=false;if(!wasOffline)await load();render();}return;}
  try{if(await offlineEdit('mark-set',i,j,!session.sets[i][j].done))return;await save(session,stored=>markSet(stored,i,j,!stored.sets[i][j].done));}catch(e){alert('Não foi possível salvar a série.');}
 };
 $('finishSession').onclick=async()=>{
  if(!session||saving||offlineSaving||!confirm('Concluir treino e salvar o tempo e as séries realizadas?'))return;
  if(!v2ReadOnly&&v2PilotRequested()){alert('Treino V1 preservado para leitura. Migração para V2 necessária antes de concluir.');return;}
  if(v2ReadOnly){
   if(!v2PilotEnabled()||!uid||auth.currentUser?.uid!==uid||!navigator.onLine)return;
   const account=uid,id=session.id;
   if((await listPendingV2Edits(account)).some(item=>item.sessionId===id)){alert('Sincronize as alterações V2 pendentes antes de concluir o treino.');return;}
   // The asynchronous queue read may finish after a sign-out or session switch.
   if(uid!==account||auth.currentUser?.uid!==account||session?.id!==id||!navigator.onLine)return;
   try{
    saving=true;render();
    await finishV2Workout({db,uid:account,sessionId:id,doc,runTransaction,serverTimestamp});
   }catch(e){console.error('V2 finish:',e);alert('Não foi possível concluir o treino V2. Verifique a conexão e o estado da sessão.');}
   finally{saving=false;await load();render();}
   return;
  }
  try{if(await offlineEdit('finish'))return;await save(session,stored=>finishSession(stored));}catch(e){alert('Não foi possível concluir o treino.');}
 };
 window.addEventListener('nexor-v2-queue-changed',refreshV2PendingCount);
 window.addEventListener('online',refreshV2PendingCount);
 onAuthStateChanged(auth,()=>{
  const accountUid=auth.currentUser?.uid||null;
  uid=accountUid;
  v2PendingCount=0;
  v2ExerciseBaselines.clear();
  refreshV2PendingCount();
  watchControl(accountUid);
  load();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && !saving)load();
 });
 window.addEventListener('focus',()=>{
  if(document.visibilityState==='visible' && !saving)load();
 });
 setInterval(render,1000);
 return {render,load};
}
