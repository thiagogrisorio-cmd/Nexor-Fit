import {startSession,markSet,finishSession,sessionProgress,remainingRest} from './workout-session.js';
import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocs,collection,query,orderBy,limit,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const db=getFirestore();
let loadGeneration=0;
const key='nexor_fit_active_session_v1',historyKey='nexor_fit_sessions_v1';
const $=id=>document.getElementById(id);
let session=null, saving=false, ready=false, uid=null, completedSessions=[];
const local=()=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
const fmt=seconds=>[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
const restfmt=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
async function save(next, operation=null){
 if(saving)throw Error('Aguarde a gravação anterior');
 saving=true;render();
 try{
  if(uid){
   const ref=doc(db,'users',uid,'sessions',next.id);
   const controlRef=doc(db,'users',uid,'sessionControl','active');
   await runTransaction(db,async tx=>{
     const control=await tx.get(controlRef);
     const currentId=control.exists()?control.data().sessionId:'';
     const stored=await tx.get(ref);
     if(next.status==='active' && !stored.exists() && currentId)throw Error('Outra sessão já está ativa');
     if(stored.exists() && stored.data().status==='completed')throw Error('Sessão já concluída');
     if(stored.exists() && currentId!==next.id)throw Error('Sessão modificada em outro aparelho');
     if(operation && !stored.exists())throw Error('Sessão não encontrada');
     const result=operation?operation(stored.data()):next;
     tx.set(ref,{...result,updatedAt:serverTimestamp()});
     next=result;
     tx.set(controlRef,{sessionId:next.status==='active'?next.id:'',updatedAt:serverTimestamp()});
   });
  }else{
   if(operation)next=operation(session);
   localStorage.setItem(key,JSON.stringify(next.status==='active'?next:null));
   if(next.status==='completed'){const history=JSON.parse(localStorage.getItem(historyKey)||'[]');history.push(next);localStorage.setItem(historyKey,JSON.stringify(history));}
  }
  session=next;
  if(next.status==='completed')completedSessions=[next,...completedSessions.filter(item=>item.id!==next.id)];
 }catch(error){if(uid)await load();throw error;}finally{saving=false;render();}
}
async function load(){
 const generation=++loadGeneration;
 uid=auth.currentUser?.uid||null;const accountUid=uid;ready=false;session=null;completedSessions=[];render();
 try{
  if(uid){
   const control=await getDoc(doc(db,'users',uid,'sessionControl','active'));
   const id=control.exists()?control.data().sessionId:'';
   if(id){const item=await getDoc(doc(db,'users',uid,'sessions',id));session=item.exists()?item.data():null;}
   const rows=await getDocs(query(collection(db,'users',uid,'sessions'),orderBy('startedAt','desc'),limit(50)));
   completedSessions=rows.docs.map(row=>row.data()).filter(item=>item.status==='completed');
  }else {session=local();completedSessions=JSON.parse(localStorage.getItem(historyKey)||'[]').slice(-50).reverse();}
  if(generation!==loadGeneration||accountUid!==uid)return;
  ready=true;
 }catch(error){if(generation!==loadGeneration)return;ready=false;console.error('Nexor session:',error);$('sessionMessage').textContent='Não foi possível carregar a sessão. Verifique a conexão.';}
 render();
}
function render(){
 const panel=$('sessionPanel');if(!panel)return;
 const history=$('sessionHistory');
 if(history)history.innerHTML=completedSessions.slice(0,20).map(item=>'<div class="log"><b>Treino '+String.fromCharCode(65+item.day)+'</b> · '+new Date(item.endedAt).toLocaleString('pt-BR')+' · '+fmt(item.durationSeconds||0)+' · '+sessionProgress(item).done+' séries</div>').join('')||'<small>Nenhuma sessão cronometrada concluída.</small>';
 const current=session?.status==='active'&&session.day===window.nexorActiveDay?.();
 panel.classList.toggle('hidden',!current);
 $('sessionStartPanel').classList.toggle('hidden',!!current);
 if(session?.status==='active'&&!current)$('sessionMessage').textContent='Há um treino em andamento. Abra o Treino '+String.fromCharCode(65+session.day)+' para continuar.';
 else $('sessionMessage').textContent='';
 $('sessionStartPanel').querySelector('button').disabled=!ready||saving||session?.status==='active';
 if(!current)return;
 const p=sessionProgress(session), elapsed=Math.max(0,Math.floor((Date.now()-Date.parse(session.startedAt))/1000));
 $('sessionElapsed').textContent=fmt(elapsed);$('sessionSets').textContent=p.done+' de '+p.total+' séries ('+p.percent+'%)';
 const rest=remainingRest(session);$('sessionRest').textContent=rest?restfmt(rest):'Pronto para a próxima série';
 $('sessionSetList').innerHTML=session.sets.map((sets,i)=>'<div class="session-set-row"><b>Exercício '+(i+1)+'</b> '+sets.map((set,j)=>'<button type="button" class="btn small '+(set.done?'':'outline')+'" data-set="'+i+'-'+j+'" '+(saving?'disabled':'')+' aria-pressed="'+set.done+'">Série '+(j+1)+(set.done?' ✓':'')+'</button>').join(' ')+'</div>').join('');
 $('finishSession').disabled=saving;
}
export function initSessionUI(getDay){
 window.nexorActiveDay=getDay;
 $('startSession').onclick=async()=>{
  if(!ready||saving)return;
  if(session?.status==='active'){alert('Conclua seu treino em andamento antes de iniciar outro.');return;}
  const minutes=Number($('restMinutes').value);
  if(!Number.isFinite(minutes)||minutes<0||minutes>10){alert('Escolha entre 0 e 10 minutos.');return;}
  try{await save(startSession({day:getDay(),restSeconds:Math.round(minutes*60)}));}catch(e){alert('Não foi possível iniciar o treino. Tente novamente.');}
 };
 $('sessionSetList').onclick=async event=>{
  const button=event.target.closest('[data-set]');if(!button||saving)return;
  const [i,j]=button.dataset.set.split('-').map(Number);
  try{await save(session,stored=>markSet(stored,i,j,!stored.sets[i][j].done));}catch(e){alert('Não foi possível salvar a série.');}
 };
 $('finishSession').onclick=async()=>{
  if(!session||saving||!confirm('Concluir treino e salvar o tempo e as séries realizadas?'))return;
  try{await save(session,stored=>finishSession(stored));}catch(e){alert('Não foi possível concluir o treino.');}
 };
 onAuthStateChanged(auth,()=>load());
 setInterval(render,1000);
 return {render,load};
}
