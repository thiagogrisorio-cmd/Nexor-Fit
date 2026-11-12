import {auth} from './auth.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,collection,addDoc,onSnapshot,query,orderBy,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {cardioForDay,cardioSummary,ENVIRONMENTS,CARDIO_LEVELS} from './cardio-model.js';
const $=id=>document.getElementById(id),db=getFirestore();
const el=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
export function initCardio({show}){
 let uid=null,generation=0,stop=null,logs=[],busy=false,lastKey='';
 $('openCardio').onclick=()=>show('cardioPage');$('cardioBack').onclick=()=>show('workouts');
 function render(){
  const program=window.nexorCoachState?.uid===uid?window.nexorCoachState?.program:null,profile=program?.profile,target=$('cardioDays');
  const key=JSON.stringify([program?.revision,uid,logs,busy]);if(key===lastKey)return;lastKey=key;target.replaceChildren();
  $('cardioEmpty').hidden=!!profile?.environment&&profile.cardioLevel!=='none';
  if(profile?.environment&&profile.cardioLevel!=='none')for(let index=0;index<profile.days;index++){
   const suggested=cardioForDay(profile,index,Math.floor(logs.length/profile.days)),article=document.createElement('article');article.className='cardio-session';
   article.append(el('span','DIA '+(index+1)+' · '+ENVIRONMENTS[suggested.environment]),el('h2',suggested.name),el('p',CARDIO_LEVELS[suggested.level]+' · '+suggested.minutes+' min sugeridos, separados da musculação.'),el('p',suggested.effort));
   const steps=el('p',suggested.minutes<=8?'Comece 1 minuto bem leve, mantenha um ritmo confortável e termine 1 minuto mais leve.':'Reserve aproximadamente 3 minutos leves para começar e 2 minutos para desacelerar. No restante, mantenha o esforço escolhido; reduza o ritmo quando precisar.');article.append(steps,el('h3','Como usar'),el('p',suggested.use));
   const tip=el('aside',suggested.tip);tip.className='cardio-tip';article.append(tip);const source=el('a','Consultar orientação');source.href=suggested.source;source.target='_blank';source.rel='noopener noreferrer';article.append(source);
   if(suggested.mode==='stairs')article.append(el('p','Sugestão conservadora do Nexor-Fit, não um limite médico. Na primeira vez, use 5 minutos. Se quiser ultrapassar 10 minutos, aumente aos poucos conforme sua adaptação e a orientação do instrutor.'));
   const actions=document.createElement('div');actions.className='cardio-actions';const label=el('label','Tempo do aeróbico (minutos)'),input=document.createElement('input');input.type='number';input.min=1;input.max=120;input.step=1;input.value=suggested.minutes;input.className='cardio-log-minutes';label.append(input);const button=el('button','Registrar aeróbico realizado');button.type='button';button.className='btn';button.disabled=busy||!navigator.onLine;
   button.onclick=async()=>{const minutes=Number(input.value),account=uid,token=generation;if(!Number.isInteger(minutes)||minutes<1||minutes>120){$('cardioStatus').textContent='Informe um tempo realizado entre 1 e 120 minutos.';return;}if(!account||busy||!navigator.onLine)return;
    if(suggested.mode==='stairs'&&minutes>10){$('cardioStatus').textContent='Escada: registre somente o tempo que você realmente fez. Progrida gradualmente; 10 minutos não é um limite universal.';}
    busy=true;button.disabled=true;try{await addDoc(collection(db,'users',account,'cardioLogs'),{mode:suggested.mode,environment:suggested.environment,level:suggested.level,minutes,dayIndex:index,performedAt:serverTimestamp()});if(token===generation&&uid===account)$('cardioStatus').textContent='Aeróbico registrado separadamente da musculação.';}catch{if(token===generation)$('cardioStatus').textContent='Não foi possível registrar. Confira a conexão e tente novamente.';}finally{if(token===generation){busy=false;lastKey='';render();}}};actions.append(label,button);article.append(el('p','Ajuste o tempo sugerido antes de fazer. Ao registrar, informe somente os minutos efetivamente realizados.'),actions);target.append(article);
  }
  const summary=cardioSummary(logs);$('cardioTotals').textContent=summary.minutes+' minutos em '+summary.sessions+' sessão(ões) recentes de aeróbico. A intensidade é registrada separadamente.';
  const rows=$('cardioEvolutionRows');rows.replaceChildren();for(const log of logs){const row=document.createElement('tr');const date=log.performedAt?.toDate?.();const names={treadmill:'Esteira',bike:'Bicicleta',elliptical:'Elíptico',stairs:'Escada',march:'Marcha no lugar',steps:'Passos laterais',boxing:'Boxe de sombra'};row.append(el('td',date?date.toLocaleDateString('pt-BR'):'Salvando…'),el('td',names[log.mode]),el('td',CARDIO_LEVELS[log.level]),el('td',log.minutes+' min'));rows.append(row);}
  $('cardioEvolutionSummary').textContent=summary.sessions?summary.minutes+' min em '+summary.sessions+' registro(s) recente(s) (até 50). Não inclui séries ou cargas de musculação.':'Nenhum aeróbico registrado. Os minutos aparecerão aqui depois de registrar uma sessão.';
 }
 window.addEventListener('nexor-coach-changed',render);window.addEventListener('online',()=>{lastKey='';render();});window.addEventListener('offline',()=>{lastKey='';render();});
 onAuthStateChanged(auth,user=>{generation++;stop?.();uid=user?.uid??null;logs=[];busy=false;lastKey='';$('cardioStatus').textContent='';render();if(!uid)return;const token=generation;stop=onSnapshot(query(collection(db,'users',uid,'cardioLogs'),orderBy('performedAt','desc'),limit(50)),snap=>{if(token===generation){logs=snap.docs.map(s=>s.data());render();}},()=>{$('cardioStatus').textContent='Não foi possível carregar o histórico aeróbico.';});});
}
