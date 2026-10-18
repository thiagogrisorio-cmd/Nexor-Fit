import {encodeSessionForFirestore,decodeSessionFromFirestore} from './firestore-session-codec.js';
import {loadWorkoutForUI} from './session-ui-loader.js';
import {canUseV2WorkoutPilot} from './workout-v2-rollout-policy.js';
import {createV2Workout,updateV2Set} from './session-v2-repository.js';
import {finishV2Workout} from './session-v2-finish.js';
import {loadV2Summary} from './session-v2-summary-reader.js';
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
const v2PilotEnabled=()=>canUseV2WorkoutPilot({search:location.search,uid,currentUid:auth.currentUser?.uid,online:navigator.onLine});
async function editV2PilotSet(exerciseIndex,setIndex){
 if(!v2PilotEnabled()||!v2ReadOnly||!uid||auth.currentUser?.uid!==uid||!navigator.onLine||!session?.id)throw Error('Edição V2 indisponível');
 const account=uid,id=session.id;
 const ref=doc(db,'users',account,'sessions',id,'exercises',String(exerciseIndex));
 const snapshot=await getDoc(ref);
 if(!snapshot.exists()||snapshot.data().index!==exerciseIndex||snapshot.data().sessionId!==id)throw Error('Exercício V2 inválido');
 const row=snapshot.data(),set=row.sets?.[setIndex];
 if(!set||typeof set.done!=='boolean')throw Error('Série V2 inválida');
 if(account!==auth.currentUser?.uid||session?.id!==id)throw Error('Sessão alterada');
 await updateV2Set({db,uid:account,sessionId:id,exerciseIndex,setIndex,done:!set.done,expectedRevision:row.revision,expectedCompletedAt:set.completedAt,runTransaction,doc,serverTimestamp});

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
   if(pending.some(item=>item.sessionId===id))return;
   applyRemoteSession(snapshot,accountUid);
  }).catch(console.warn);
 },error=>console.error('Nexor live session:',error));
}
function applyRemoteSession(snapshot,accountUid){
 if(uid!==accountUid||auth.currentUser?.uid!==accountUid||saving)return;
  if(snapshot.exists()&&snapshot.data().schemaVersion===2){
  v2ReadOnly=true;
  v2Notice='Treino V2 detectado. Carregando exercícios em modo somente leitura.';
  render();
  const token=++v2LoadToken;
  loadWorkoutForUI({db,uid:accountUid,sessionId:snapshot.id,doc,getDoc}).then(result=>{
   if(token!==v2LoadToken||uid!==accountUid||auth.currentUser?.uid!==accountUid||observedSessionId!==snapshot.id)return;
   v2Notice=result.status==='ready'?'Treino V2 carregado em modo somente leitura. Edição ainda indisponível.':'Treino V2 incompleto ou indisponível. Nenhuma alteração foi realizada.';
   session=result.status==='ready'&&result.session.status==='active'?result.session:null;
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
 if(v2ReadOnly)throw Error('Sessão V2 somente leitura');
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
 if(v2ReadOnly)throw Error('Sessão V2 somente leitura');
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
 const generation=++loadGeneration;
 uid=auth.currentUser?.uid||null;const accountUid=uid;ready=false;session=null;completedSessions=[];v2Notice='';v2ReadOnly=false;render();
 let loadedSession=null,loadedHistory=[];
 try{
  if(uid){
   const control=await getDoc(doc(db,'users',uid,'sessionControl','active'));
   const id=control.exists()?control.data().sessionId:'';
   if(id){const result=await loadWorkoutForUI({db,uid:accountUid,sessionId:id,doc,getDoc});if(result.format==='v2'||result.status==='incomplete'){v2ReadOnly=true;v2Notice=result.status==='ready'?'Treino V2 em modo somente leitura.':'Treino V2 incompleto. Edição bloqueada.';}loadedSession=result.status==='ready'?result.session:null;}
   const rows=await getDocs(query(collection(db,'users',uid,'sessions'),orderBy('startedAt','desc'),limit(50)));
   loadedHistory=rows.docs.filter(row=>row.data().schemaVersion!==2).map(row=>decodeSessionFromFirestore(row.data())).filter(item=>item.status==='completed');
   if(v2PilotEnabled()){
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
  if(accountUid){
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
  if(accountUid&&session?.status==='active')await cacheOnlineWorkout(accountUid,session).then(()=>localStorage.setItem(activeCacheKey(accountUid),session.id)).catch(console.warn);
  ready=true;
 }catch(error){if(generation!==loadGeneration)return;ready=false;console.error('Nexor session:',error);$('sessionMessage').textContent='Não foi possível carregar a sessão. Verifique a conexão.';}
 render();
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
 else $('sessionMessage').textContent=v2Notice;
 $('sessionStartPanel').querySelector('button').disabled=!ready||saving||v2ReadOnly||session?.status==='active';
 if(!current)return;
 const p=sessionProgress(session), elapsed=Math.max(0,Math.floor((Date.now()-Date.parse(session.startedAt))/1000));
 $('sessionElapsed').textContent=fmt(elapsed);$('sessionSets').textContent=p.done+' de '+p.total+' séries ('+p.percent+'%)';
 const rest=remainingRest(session);$('sessionRest').textContent=rest?restfmt(rest):'Pronto para a próxima série';
 const pilotEdit=v2ReadOnly&&v2PilotEnabled()&&!!uid&&navigator.onLine;
 const setKey=JSON.stringify([session.id,session.sets,saving,offlineSaving,v2ReadOnly,pilotEdit]);
 if(renderedSetKey!==setKey){renderedSetKey=setKey;$('sessionSetList').innerHTML=session.sets.map((sets,i)=>'<div class="session-set-row"><b>Exercício '+(i+1)+'</b> '+sets.map((set,j)=>'<button type="button" class="btn small '+(set.done?'':'outline')+'" data-set="'+i+'-'+j+'" '+(saving||offlineSaving||(v2ReadOnly&&!pilotEdit)?'disabled':'')+' aria-pressed="'+set.done+'">Série '+(j+1)+(set.done?' ✓':'')+'</button>').join(' ')+'</div>').join('');}
 $('finishSession').disabled=saving||offlineSaving||(v2ReadOnly&&!(v2PilotEnabled()&&!!uid&&navigator.onLine));
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
   const pilot=v2PilotEnabled();
   if(pilot&&uid&&auth.currentUser?.uid===uid){
    saving=true;render();
    try{
     await createV2Workout({db,uid,session:next,runTransaction,doc,serverTimestamp});
    }finally{saving=false;render();}
    await load();
   }else await save(next);
  }catch(e){console.error('Nexor start:',e);alert('Não foi possível iniciar o treino. Tente novamente.');}
 };
 $('sessionSetList').onclick=async event=>{
  const button=event.target.closest('[data-set]');if(!button||saving||offlineSaving)return;
  const [i,j]=button.dataset.set.split('-').map(Number);
  if(v2ReadOnly){try{saving=true;render();await editV2PilotSet(i,j);}catch(e){console.error('V2 set:',e);alert('Não foi possível atualizar a série V2. Atualize a sessão e tente novamente.');}finally{saving=false;await load();render();}return;}
  try{if(await offlineEdit('mark-set',i,j,!session.sets[i][j].done))return;await save(session,stored=>markSet(stored,i,j,!stored.sets[i][j].done));}catch(e){alert('Não foi possível salvar a série.');}
 };
 $('finishSession').onclick=async()=>{
  if(!session||saving||offlineSaving||!confirm('Concluir treino e salvar o tempo e as séries realizadas?'))return;
  if(v2ReadOnly){
   if(!v2PilotEnabled()||!uid||auth.currentUser?.uid!==uid||!navigator.onLine)return;
   const account=uid,id=session.id;
   try{
    saving=true;render();
    await finishV2Workout({db,uid:account,sessionId:id,doc,runTransaction,serverTimestamp});
   }catch(e){console.error('V2 finish:',e);alert('Não foi possível concluir o treino V2. Verifique a conexão e o estado da sessão.');}
   finally{saving=false;await load();render();}
   return;
  }
  try{if(await offlineEdit('finish'))return;await save(session,stored=>finishSession(stored));}catch(e){alert('Não foi possível concluir o treino.');}
 };
 onAuthStateChanged(auth,()=>{
  const accountUid=auth.currentUser?.uid||null;
  uid=accountUid;
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
