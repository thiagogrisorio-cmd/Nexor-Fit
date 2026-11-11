import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,doc,getDocs,getDoc,query,orderBy,limit} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {exerciseIdentity,projectLoadTrend} from './training-prescription.js';
const db=getFirestore(),$=id=>document.getElementById(id);
export function initLoadEvolution({defaults}){
 let generation=0,visible=false;
 function choices(){
  const day=Number($('evolutionDay').value),selected=$('evolutionExercise').value;
  $('evolutionExercise').replaceChildren();
  (window.nexorWorkoutDays||defaults)[day][2].forEach((encoded,index)=>{
   const option=document.createElement('option');option.value=String(index);option.textContent=encoded.split('|')[1];$('evolutionExercise').append(option);
  });
  if(selected)$('evolutionExercise').value=selected;
 }
 function clear(message){$('evolutionChart').replaceChildren();$('evolutionRows').replaceChildren();$('evolutionStatus').textContent=message;$('evolutionPeak').textContent='—';$('evolutionChange').textContent='—';}
 async function load(){
  const token=++generation,uid=auth.currentUser?.uid;
  clear(!uid?'Entre para consultar suas cargas.':'Carregando sessões concluídas…');
  if(!visible||!uid)return;
  if(!navigator.onLine){clear('Conecte-se para consultar as cargas salvas na sua conta.');return;}
  const day=Number($('evolutionDay').value),index=Number($('evolutionExercise').value);
  const identity=exerciseIdentity((window.nexorWorkoutDays||defaults)[day][2][index]);
  try{
   const snapshots=await getDocs(query(collection(db,'users',uid,'sessions'),orderBy('startedAt','desc'),limit(50)));
   if(token!==generation||uid!==auth.currentUser?.uid)return;
   const candidates=snapshots.docs.filter(snapshot=>{const data=snapshot.data();return data.schemaVersion===2&&data.status==='completed'&&data.day===day&&exerciseIdentity((data.prescription||defaults[day][2])[index])===identity;}).slice(0,12);
   const rows=await Promise.all(candidates.map(async snapshot=>{
    const data=snapshot.data(),exercise=await getDoc(doc(db,'users',uid,'sessions',snapshot.id,'exercises',String(index)));
    return {id:snapshot.id,at:Date.parse(data.endedAt),sets:exercise.exists()?exercise.data().sets:[]};
   }));
   if(token!==generation||uid!==auth.currentUser?.uid||!visible)return;
   const trend=projectLoadTrend(rows);
   if(!trend.length){clear('Ainda não há cargas registradas para este exercício nas sessões consultadas.');return;}
   $('evolutionPeak').textContent=Math.max(...trend.map(row=>row.weight))+' kg';
   const delta=trend.at(-1).weight-trend[0].weight;$('evolutionChange').textContent=trend.length<2?'—':(delta>0?'+':'')+Math.round(delta*100)/100+' kg';
   const max=Math.max(1,...trend.map(row=>row.weight));
   trend.forEach(row=>{
    const date=new Date(row.at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const bar=document.createElement('div');bar.className='load-bar';
    const label=document.createElement('span');label.textContent=row.weight+' kg';
    const column=document.createElement('div');column.style.height=Math.max(3,145*row.weight/max)+'px';
    const caption=document.createElement('small');caption.textContent=date;bar.append(label,column,caption);$('evolutionChart').append(bar);
    const tr=document.createElement('tr');for(const text of [new Date(row.at).toLocaleDateString('pt-BR'),row.weight+' kg']){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('evolutionRows').append(tr);
   });
   $('evolutionStatus').textContent=trend.length+' sessão(ões) com carga. Maior carga das séries concluídas; consulta limitada às 50 sessões recentes e aos últimos 12 treinos correspondentes.';
  }catch{if(token===generation)clear('Não foi possível consultar sua evolução. Tente novamente.');}
 }
 $('evolutionDay').onchange=()=>{choices();load();};$('evolutionExercise').onchange=load;$('refreshEvolution').onclick=load;
 window.addEventListener('nexor-screen',event=>{visible=event.detail==='evolutionPage';generation++;if(visible){choices();load();}});
 window.addEventListener('nexor-plans-changed',()=>{if(visible){choices();load();}});
 onAuthStateChanged(auth,()=>{generation++;clear('Entre para consultar suas cargas.');if(visible)load();});
 choices();
}
