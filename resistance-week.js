import {EXERCISES,exerciseById,eligible} from './coaching-catalog.js';
import {dayEnvironment,equipmentForDay} from './cardio-model.js';
import {unilateralExercise,exerciseCategory,patternMuscles} from './resistance-metadata.js';
const levelNumber=p=>['basic','intermediate','advanced'].indexOf(p.level);
// This deliberately overestimates the last rest period and allows equipment transitions.
export function estimateSessionMinutes(exercises){return Math.ceil((300+exercises.reduce((sum,row)=>{const e=exerciseById(row.id),sides=unilateralExercise(e)?2:1;return sum+row.sets*(row.reps*3*sides+row.restSeconds)+60;},0))/60);}
function orderedCandidates(pattern,p,environment,used){
 return EXERCISES.filter(e=>e.pattern===pattern&&eligible(e,p)&&!used.has(e.id)).sort((a,b)=>{
  const score=e=>(environment==='gym'&&e.equipment.length?100:0)+Math.min(e.level,levelNumber(p))*10+(e.name==='Flexão de braços na parede'?-20:0)+(e.name==='Bird dog'&&p.goal==='muscle'?-2:0);
  return score(b)-score(a)||a.id.localeCompare(b.id);
 });
}
const focusPatterns={balanced:[],legs:['squat','lunge','knee-flexion'],glutes:['hinge','bridge','lunge'],chest:['push-horizontal','chest-isolation'],back:['pull-horizontal','pull-vertical'],shoulders:['push-vertical','shoulder-lateral'],arms:['elbow-flexion','elbow-extension']};
function gymRole(p,gymIndex){
 if(p.gymDays===1||p.days<=3)return gymIndex%2?'full-b':'full-a';
 return gymIndex%2?'lower-pull':'upper';
}
function homeRole(p,homeIndex){
 if(p.environment==='home')return p.days<=3?(homeIndex%2?'home-full-b':'home-full-a'):(homeIndex%2?'home-upper':'home-lower');
 if(p.gymDays===1)return ['home-core','home-lower','home-upper','home-core','home-lower'][homeIndex%5];
 if(p.days===3)return 'home-complement';
 return homeIndex%2?'home-upper':'home-lower';
}
const roles={
 'full-a':{name:'Base A',why:'Base de corpo todo com carga: agachar, empurrar e remar. O trabalho posterior complementa os movimentos principais.',patterns:['squat','push-horizontal','pull-horizontal','knee-flexion','core','shoulder-lateral']},
 'full-b':{name:'Base B',why:'Segunda base da semana: inclui puxada vertical e trabalho posterior, preservando os movimentos fundamentais para acompanhar sua evolução.',patterns:['pull-vertical','squat','push-horizontal','hinge','knee-flexion','shoulder-lateral','core']},
 upper:{name:'Superiores com carga',why:'Concentra empurrar e puxar na academia. Os dias em casa complementam pernas e core sem depender de remadas improvisadas.',patterns:['push-horizontal','pull-horizontal','pull-vertical','push-vertical','elbow-flexion','elbow-extension','shoulder-lateral']},
 'lower-pull':{name:'Inferiores + puxada',why:'Prioriza pernas com carga e inclui outra exposição de costas quando os dias em casa não oferecem resistência para puxar.',patterns:['squat','pull-vertical','hinge','lunge','knee-flexion','calves','core']},
 'home-complement':{name:'Complementar em casa',why:'Complementa as duas bases da academia com trabalho unilateral, glúteos e core. Não pretende reproduzir a carga de uma sessão de aparelhos.',patterns:['lunge','push-horizontal','bridge','core','calves']},
 'home-lower':{name:'Pernas + core em casa',why:'Trabalha pernas de forma unilateral e glúteos, com core ao final. Sem exigir móveis, elásticos ou aparelhos.',patterns:['lunge','bridge','squat','core','calves']},
 'home-upper':{name:'Empurrar + core em casa',why:'Complementa peitoral e tríceps com flexões e estabilidade do tronco. Puxadas com resistência permanecem nos dias de academia.',patterns:['push-horizontal','push-vertical','core','calves']},
 'home-core':{name:'Core e complemento',why:'Sessão complementar de menor sobreposição com a base da academia. Não conta como uma segunda sessão de costas com resistência.',patterns:['core','calves']},
 'home-full-a':{name:'Corpo todo A em casa',why:'Combina agachamento, flexão e glúteos sem aparelhos. Costas com resistência ficam limitadas sem equipamento para puxar.',patterns:['squat','push-horizontal','bridge','core','calves']},
 'home-full-b':{name:'Corpo todo B em casa',why:'Alterna a ênfase para pernas unilaterais, mantendo flexões e core. Não usa exercícios escapulares como substitutos de remada.',patterns:['lunge','push-horizontal','bridge','core','calves']}
};
const splitRoles={
 push:{name:'Peito, ombros e tríceps',why:'Empurrar com peitoral, deltoides e tríceps. Abdômen complementa a sessão conforme o tempo.',patterns:['push-horizontal','push-vertical','elbow-extension','core','chest-isolation','shoulder-lateral']},
 pull:{name:'Costas e bíceps',why:'Combina puxadas vertical e horizontal, bíceps e deltoide posterior.',patterns:['pull-vertical','pull-horizontal','elbow-flexion','core','shoulder-rear','lat-isolation']},
 upperA:{name:'Superiores A',why:'Peitoral e costas primeiro, seguidos de ombros e braços. Equilibra empurrar e puxar.',patterns:['push-horizontal','pull-horizontal','push-vertical','elbow-flexion','elbow-extension','core']},
 upperB:{name:'Superiores B',why:'Outra ênfase para costas e peitoral, com braços e ombros. As alternativas são distribuídas entre os dias.',patterns:['pull-vertical','push-horizontal','elbow-extension','elbow-flexion','shoulder-lateral','core']},
 lowerA:{name:'Inferiores · quadríceps',why:'Ênfase em extensão dos joelhos: agachamento/leg press, unilateral e extensora. Panturrilhas e abdômen complementam.',patterns:['squat','lunge','knee-extension','core','calves','hip-adduction']},
 lowerB:{name:'Inferiores · posteriores e glúteos',why:'Ênfase posterior: flexora, extensão do quadril e glúteos. Usa opções corporais em casa; não presume equivalência de carga.',patterns:['knee-flexion','hinge','bridge','core','hip-abduction','calves']},
 lowerC:{name:'Inferiores · unilateral e estabilidade',why:'Terceira sessão complementar: unilateral, abdutores/adutores e panturrilhas, sem repetir a ficha de quadríceps.',patterns:['lunge','hip-abduction','hip-adduction','core','calves','bridge']},
 lowerAll:{name:'Inferiores · completo',why:'Única sessão de inferiores: combina quadríceps, posteriores e glúteos, com panturrilhas e abdômen conforme o tempo.',patterns:['squat','knee-flexion','bridge','core','calves','lunge']},
 fullA:{name:'Full body · ênfase em agachar',why:'Inferiores, empurrar e puxar na mesma sessão. Ombros e braços também trabalham indiretamente nos movimentos compostos.',patterns:['squat','push-horizontal','pull-horizontal','core','knee-flexion','shoulder-lateral']},
 fullB:{name:'Full body · ênfase posterior',why:'Alterna a ênfase dos inferiores e a direção da puxada. Mantém empurrar, puxar e core quando o tempo permite.',patterns:['hinge','push-horizontal','pull-vertical','core','lunge','elbow-extension']},
 fullC:{name:'Full body · ênfase unilateral',why:'Combina unilateral de pernas com peito e costas, e alterna o complemento de braços e ombros.',patterns:['lunge','push-horizontal','pull-horizontal','core','shoulder-lateral','elbow-flexion']}
};
Object.assign(roles,splitRoles);
function buildSelectedStyle(profile){
 const usage=new Map(),week=[];
 const count=profile.days,lowerCount=count>4?(profile.lowerDays??2):count===4?2:1;
 const lowerIndices=new Set();
 // Spread lower sessions around the upper sessions; rotate for the requested starting order.
 const start=profile.gender==='female'?0:1;
 for(let j=0;j<lowerCount;j++)lowerIndices.add((start+Math.round(j*count/lowerCount))%count);
 if(profile.environment==='hybrid'&&profile.gender!=='female'){
  // Prefer bodyweight lower work at home, leaving gym slots available for loaded pulls.
  for(let i=1;i<count;i++)if(dayEnvironment(profile,i)==='home'&&!lowerIndices.has(i)){
   const move=[...lowerIndices].find(k=>k!==0&&dayEnvironment(profile,k)==='gym');if(move!==undefined){lowerIndices.delete(move);lowerIndices.add(i);}
  }
 }
 let lowerIndex=0,upperIndex=0;
 for(let index=0;index<count;index++){
  const environment=dayEnvironment(profile,index),p={...profile,equipment:equipmentForDay(profile,index)};
  let role;
  if(profile.trainingStyle==='fullbody')role=['fullA','fullB','fullC'][index%3];
  else if(lowerIndices.has(index))role=lowerCount===1?'lowerAll':['lowerA','lowerB','lowerC'][lowerIndex++];
  else {const upperCount=count-lowerCount;role=(upperCount>=3?['push','pull','upperA','upperB','push']:['upperA','upperB'])[upperIndex++];}
  const template=splitRoles[role],chosen=[],used=new Set();let patterns=[...template.patterns];
  const additional=focusPatterns[p.focus].filter(x=>patterns.includes(x));
  patterns=[...new Set([...patterns.slice(0,3),...additional,...patterns.slice(3)])];
  if(environment==='home'){
   if(role.startsWith('lower'))patterns=role==='lowerB'?['bridge','lunge','core','hip-abduction','calves']:['squat','lunge','core','hip-abduction','calves','bridge'];
   else if(role.startsWith('full'))patterns=[role==='fullB'?'bridge':role==='fullC'?'lunge':'squat','push-horizontal','core','hip-abduction','calves'];
   else patterns=['push-horizontal','core','hip-abduction','calves'];
  }
  // Beginners without a hinge option still receive posterior-chain work.
  if(role==='fullB'&&!EXERCISES.some(e=>e.pattern==='hinge'&&eligible(e,p)))patterns[0]='bridge';
  for(const pattern of patterns){
   let candidates=orderedCandidates(pattern,p,environment,used);
   candidates.sort((a,b)=>(usage.get(a.id)??0)-(usage.get(b.id)??0));
   // Alternate flexion, anti-rotation and lateral stabilization across sessions.
   if(pattern==='core'){const sections=['flexão','anti-rotação','estabilidade lateral','anti-extensão','controle da pelve'];const preferred=candidates.filter(e=>e.group.includes(sections[index%sections.length]));if(preferred.length)candidates=preferred;}
   if(environment==='gym'&&candidates.some(e=>e.equipment.length))candidates=candidates.filter(e=>e.equipment.length);
   for(const e of candidates){
    const compound=exerciseCategory(e)==='compound',reps=pattern==='core'?8:p.goal==='endurance'?15:p.goal==='strength'&&compound?6:compound?10:12;
    // More frequent full-body sessions distribute work rather than multiplying daily volume.
    const desired=profile.trainingStyle==='fullbody'&&count>=4?2:p.level==='basic'?2:p.level==='intermediate'?3:4;
    let row={id:e.id,sets:desired,reps,restSeconds:compound?(p.goal==='strength'?120:90):60};
    while(row.sets>2&&(estimateSessionMinutes([...chosen,row])>p.minutes||chosen.length===0&&estimateSessionMinutes([row])>(p.minutes+5)/2))row={...row,sets:row.sets-1};
    if(estimateSessionMinutes([...chosen,row])>p.minutes)continue;
    chosen.push(row);used.add(e.id);usage.set(e.id,(usage.get(e.id)??0)+1);break;
   }
   if(chosen.length===6)break;
  }
  if(chosen.length<2)throw Error('Aumente o tempo para permitir execução e descanso adequados.');
  chosen.sort((a,b)=>Number(exerciseCategory(exerciseById(a.id))==='accessory')-Number(exerciseCategory(exerciseById(b.id))==='accessory'));
  if(profile.trainingStyle==='fullbody'&&environment==='gym'&&(!chosen.some(r=>exerciseById(r.id).pattern.startsWith('pull-'))||!chosen.some(r=>exerciseById(r.id).pattern==='push-horizontal')))
   throw Error('Para combinar inferiores, empurrar e puxar com esse descanso, escolha pelo menos 30 minutos no full body.');
  const homeUpper=environment==='home'&&!role.startsWith('lower')&&!role.startsWith('full');
  week.push({name:'Treino '+String.fromCharCode(65+index)+' · '+(environment==='gym'?'Academia: ':'Casa: ')+(homeUpper?'Empurrar e core (sem puxada)':template.name),exercises:chosen,estimatedMinutes:estimateSessionMinutes(chosen)});
 }
 return week;
}
export function buildResistanceWeek(profile){
 if(profile.trainingStyle)return buildSelectedStyle(profile);
 let gymIndex=0,homeIndex=0;const weeklySets={};
 const offsets={2:[0,3],3:[0,2,4],4:[0,1,3,5],5:[0,1,3,4,6],6:[0,1,2,4,5,6]}[profile.days];
 const plannedRoles=Array.from({length:profile.days},(_,i)=>dayEnvironment(profile,i)==='gym'?(profile.environment==='gym'&&profile.days>=4?(gymIndex++%2?'lower-pull':'upper'):gymRole(profile,gymIndex++)):homeRole(profile,homeIndex++));
 if(profile.environment==='hybrid')for(let i=0;i<plannedRoles.length;i++){
  const home=plannedRoles[i];if(dayEnvironment(profile,i)!=='home'||!['home-lower','home-upper','home-complement'].includes(home))continue;
  const overlap=plannedRoles.some((gym,j)=>{if(dayEnvironment(profile,j)!=='gym')return false;const distance=Math.min(Math.abs(offsets[i]-offsets[j]),7-Math.abs(offsets[i]-offsets[j]));if(distance>=2)return false;return gym.startsWith('full')||home==='home-complement'||home==='home-lower'&&gym==='lower-pull'||home==='home-upper'&&gym==='upper';});
  if(overlap)plannedRoles[i]='home-core';
 }
 return Array.from({length:profile.days},(_,index)=>{
  const environment=dayEnvironment(profile,index),p={...profile,equipment:equipmentForDay(profile,index)};
  const role=plannedRoles[index];
  const template=roles[role],priorities=focusPatterns[p.focus],base=[...template.patterns];
  // Essentials stay first. Goal-specific accessories are inserted before the generic accessories.
  const essentialCount=environment==='gym'?3:role==='home-complement'?3:2;
  const lowerPatterns=['squat','hinge','lunge','bridge','knee-flexion'];
  const optional=priorities.filter(pattern=>!base.slice(0,essentialCount).includes(pattern)&&(role==='upper'?!lowerPatterns.includes(pattern):role==='lower-pull'?lowerPatterns.includes(pattern)||pattern.startsWith('pull-'):environment==='home'?base.includes(pattern):true)&&orderedCandidates(pattern,p,environment,new Set()).length);
  const order=[...new Set([...base.slice(0,essentialCount),...optional,...base.slice(essentialCount)])];
  const chosen=[],used=new Set();
  for(const pattern of order){
   const candidates=orderedCandidates(pattern,p,environment,used);if(!candidates.length)continue;
   // Preserve productive, trackable lifts instead of shuffling them whenever a profile is saved.
   const e=candidates[0],compound=exerciseCategory(e)==='compound';
   const reps=e.pattern==='core'?(p.goal==='endurance'?12:8):p.goal==='endurance'?15:p.goal==='strength'&&compound?6:compound?10:12;
   const restSeconds=p.goal==='strength'&&compound?120:compound?90:60;
   const desired=p.level==='basic'?2:p.level==='intermediate'?3:4;
   let row={id:e.id,sets:desired,reps,restSeconds};
   if(chosen.length===0)while(row.sets>2&&(estimateSessionMinutes([row])*60-300)>(p.minutes*60-300)/2)row={...row,sets:row.sets-1};
   while(row.sets>2&&estimateSessionMinutes([...chosen,row])>p.minutes)row={...row,sets:row.sets-1};
   if(estimateSessionMinutes([...chosen,row])>p.minutes)continue;
   const cap=p.level==='basic'?10:p.level==='intermediate'?14:18;
   if(chosen.length>=2&&(patternMuscles[e.pattern]??[]).some(m=>(weeklySets[m]??0)+row.sets>cap))continue;
   chosen.push(row);used.add(e.id);
   for(const muscle of patternMuscles[e.pattern]??[])weeklySets[muscle]=(weeklySets[muscle]??0)+row.sets;
   if(chosen.length===6)break;
  }
  if(chosen.length<2)throw Error('O tempo não comporta esta sessão com execução e descanso adequados. Aumente o tempo por sessão.');
  chosen.sort((a,b)=>Number(exerciseCategory(exerciseById(a.id))==='accessory')-Number(exerciseCategory(exerciseById(b.id))==='accessory'));
  return {name:'Treino '+String.fromCharCode(65+index)+' · '+(environment==='gym'?'Academia: ':'Casa: ')+template.name,exercises:chosen,estimatedMinutes:estimateSessionMinutes(chosen)};
 });
}
export function assessResistanceWeek(program){
 const sets={},frequency={},details=[];
 for(const [index,day]of program.days.entries()){
  const seen=new Set(),environment=dayEnvironment(program.profile,index);
  for(const row of day.exercises){const e=exerciseById(row.id);for(const m of patternMuscles[e.pattern]??[]){sets[m]=(sets[m]??0)+row.sets;seen.add(m);}}
  for(const m of seen)frequency[m]=(frequency[m]??0)+1;
  let role=Object.values(roles).find(r=>day.name.endsWith(r.name));details.push({index,environment,explanation:role?.why??(day.name.includes('sem puxada')?'Sem equipamento em casa, esta sessão trabalha empurrar e core. Não equivale a uma sessão de costas e bíceps; confira a cobertura dos dias de academia.':'Ficha anterior: confira os movimentos e o volume antes de atualizar.')});
 }
 const warnings=[];
 if(program.profile.trainingStyle){
  const counts=new Map();for(const d of program.days)for(const r of d.exercises)counts.set(r.id,(counts.get(r.id)??0)+1);
  if([...counts.values()].some(n=>n>1))warnings.push('Alguns movimentos se repetem quando faltam alternativas adequadas ao nível e ao local. A prioridade é manter estímulos úteis e acompanhar a progressão, sem inventar variações equivalentes.');
  if(!sets.Core)warnings.push('O tempo disponível não comportou trabalho direto de abdômen nesta ficha. Aumente o tempo da sessão para incluir flexão e estabilidade do tronco.');
  if(program.profile.trainingStyle==='fullbody'&&program.profile.days>=4)warnings.push('Full body frequente usa volume reduzido por sessão. Não faça todas as sessões pesadas em dias consecutivos: ajuste o esforço e reserve recuperação conforme sua tolerância.');
  if(program.profile.trainingStyle==='fullbody'&&program.profile.environment!=='gym')warnings.push('Full body em casa tem uma limitação: sem equipamento para puxar, não há estímulo equivalente para dorsais e bíceps. Os dias de academia incluem puxadas; somente peso corporal não garante a mesma cobertura.');
 }
 if((frequency.Costas??0)<2)warnings.push('Costas com resistência aparecem em menos de dois dias. Sem aparelho para puxar em casa, não há substituto equivalente no catálogo. Considere dois dias de academia ou orientação para ajustar a rotina.');
 if(program.profile.goal==='muscle'&&program.profile.minutes<=30)warnings.push('Com 30 minutos ou menos, a ficha prioriza uma base inicial. Isso pode limitar o volume semanal para maximizar hipertrofia; mais tempo ou uma revisão com profissional pode ser necessário.');
 if(program.profile.goal==='strength'&&program.profile.environment!=='gym')warnings.push('Exercícios corporais complementam a rotina, mas não garantem intensidade equivalente às cargas da academia para força máxima.');
 const schedule={2:['Segunda','Quinta'],3:['Segunda','Quarta','Sexta'],4:['Segunda','Terça','Quinta','Sábado'],5:['Segunda','Terça','Quinta','Sexta','Domingo'],6:['Segunda','Terça','Quarta','Sexta','Sábado','Domingo']}[program.profile.days];
 return {sets,frequency,details,warnings,schedule,progression:'Escolha uma carga ou variação que deixe cerca de 2–3 repetições possíveis com boa técnica. Quando completar as séries com controle e sobra de esforço, aumente a carga em pequeno passo disponível ou escolha uma variação corporal mais difícil. Não é necessário treinar até a falha.',recovery:'Distribua as sessões pela semana. O calendário é um exemplo, não uma medição da sua recuperação; se o mesmo grupo continua dolorido ou seu desempenho caiu, ajuste o intervalo antes de repetir o estímulo.'};
}
