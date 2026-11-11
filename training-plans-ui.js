import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,collection,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {encodePrescriptionExercise,validateTrainingPlan} from './training-prescription.js';
const db=getFirestore(),$=id=>document.getElementById(id);
export function initTrainingPlansUI({defaults,onPlans}){
 let account=null,generation=0,stop=null,revisions={},loaded=false,saving=false,editing=null;
 const original=structuredClone(defaults),plans=()=>window.nexorWorkoutDays;
 const message=text=>$('planEditorStatus').textContent=text;
 function controls(){ $('editTrainingPlan').disabled=!account||!loaded||saving||!!editing||!navigator.onLine;$('planDay').disabled=saving||!!editing;$('saveTrainingPlan').disabled=saving||!navigator.onLine;$('cancelTrainingPlan').disabled=saving; }
 function cancel(){editing=null;$('planEditor').hidden=true;$('planFields').replaceChildren();$('planFocus').value='';message('');controls();}
 $('editTrainingPlan').onclick=()=>{
  if(!account||!loaded||saving||!navigator.onLine)return;
  const day=Number($('planDay').value),plan=plans()[day];
  editing={day,revision:revisions[day]||0,uid:account,generation};
  $('planFocus').value=plan[1];$('planFields').replaceChildren();
  plan[2].forEach((encoded,index)=>{
   const [group,name,reps]=encoded.split('|');const fieldset=document.createElement('fieldset');
   const legend=document.createElement('legend');legend.textContent='Exercício '+(index+1);fieldset.append(legend);
   for(const [key,label,value,max] of [['group','Grupo muscular',group,40],['name','Exercício',name,120],['reps','Repetições',reps,40]]){
    const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.name=key;input.value=value;input.required=true;input.maxLength=max;wrap.append(input);fieldset.append(wrap);
   }
   $('planFields').append(fieldset);
  });
  $('planEditor').hidden=false;controls();message('As alterações valem para novos treinos. Sessões e histórico existentes serão preservados.');$('planFocus').focus();
 };
 $('cancelTrainingPlan').onclick=cancel;
 $('planEditor').onsubmit=async event=>{
  event.preventDefault();if(!editing||saving||!navigator.onLine||auth.currentUser?.uid!==editing.uid)return;
  const intent={...editing};let value;
  try{value=validateTrainingPlan({revision:intent.revision+1,focus:$('planFocus').value,exercises:[...$('planFields').children].map(fieldset=>encodePrescriptionExercise(Object.fromEntries([...fieldset.querySelectorAll('input')].map(input=>[input.name,input.value]))))});}
  catch(error){message(error.message);return;}
  saving=true;controls();message('Salvando seu treino…');
  try{
   await runTransaction(db,async tx=>{
    const ref=doc(db,'users',intent.uid,'trainingPlans',String(intent.day));const existing=await tx.get(ref);
    if((existing.exists()?existing.data().revision:0)!==intent.revision)throw Error('Este treino foi editado em outro aparelho. Cancele e abra novamente para conferir a nova versão.');
    if(auth.currentUser?.uid!==intent.uid)throw Error('A conta foi alterada.');
    tx.set(ref,{...value,updatedAt:serverTimestamp()});
   });
   if(intent.generation===generation){cancel();message('Treino salvo. A nova ficha será usada nas próximas sessões.');}
  }catch(error){if(intent.generation===generation)message(error.code?'Não foi possível salvar na sua conta. Verifique a conexão; seu formulário continua disponível.':error.message||'Não foi possível salvar. Seu formulário continua disponível.');}
  finally{saving=false;controls();}
 };
 onAuthStateChanged(auth,user=>{
  generation++;account=user?.uid||null;stop?.();stop=null;loaded=false;window.nexorTrainingPlansReady=false;revisions={};cancel();onPlans(structuredClone(original));controls();
  if(!account){message('Entre na sua conta para personalizar os treinos.');return;}
  const token=generation;
  stop=onSnapshot(collection(db,'users',account,'trainingPlans'),{includeMetadataChanges:true},snapshot=>{
   if(token!==generation)return;const next=structuredClone(original),versions={};
   try{for(const item of snapshot.docs){if(!/^[0-3]$/.test(item.id))continue;const plan=validateTrainingPlan(item.data());next[Number(item.id)]=[original[Number(item.id)][0],plan.focus,plan.exercises];versions[item.id]=plan.revision;}}
   catch{message('Ficha inválida recebida. Nenhuma alteração foi aplicada.');loaded=false;window.nexorTrainingPlansReady=false;controls();return;}
   revisions=versions;loaded=!snapshot.metadata.fromCache;window.nexorTrainingPlansReady=loaded;onPlans(next);controls();
  },()=>{if(token===generation){loaded=false;window.nexorTrainingPlansReady=false;controls();message('Não foi possível carregar suas fichas. Verifique a conexão.');}});
 });
 window.addEventListener('online',controls);window.addEventListener('offline',controls);
}
