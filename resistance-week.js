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
export function buildResistanceWeek(profile){
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
  let role=Object.values(roles).find(r=>day.name.endsWith(r.name));details.push({index,environment,explanation:role?.why??'Ficha anterior: confira os movimentos e o volume antes de atualizar.'});
 }
 const warnings=[];
 if((frequency.Costas??0)<2)warnings.push('Costas com resistência aparecem em menos de dois dias. Sem aparelho para puxar em casa, não há substituto equivalente no catálogo. Considere dois dias de academia ou orientação para ajustar a rotina.');
 if(program.profile.goal==='muscle'&&program.profile.minutes<=30)warnings.push('Com 30 minutos ou menos, a ficha prioriza uma base inicial. Isso pode limitar o volume semanal para maximizar hipertrofia; mais tempo ou uma revisão com profissional pode ser necessário.');
 if(program.profile.goal==='strength'&&program.profile.environment!=='gym')warnings.push('Exercícios corporais complementam a rotina, mas não garantem intensidade equivalente às cargas da academia para força máxima.');
 const schedule={2:['Segunda','Quinta'],3:['Segunda','Quarta','Sexta'],4:['Segunda','Terça','Quinta','Sábado'],5:['Segunda','Terça','Quinta','Sexta','Domingo'],6:['Segunda','Terça','Quarta','Sexta','Sábado','Domingo']}[program.profile.days];
 return {sets,frequency,details,warnings,schedule,progression:'Escolha uma carga ou variação que deixe cerca de 2–3 repetições possíveis com boa técnica. Quando completar as séries com controle e sobra de esforço, aumente a carga em pequeno passo disponível ou escolha uma variação corporal mais difícil. Não é necessário treinar até a falha.',recovery:'Distribua as sessões pela semana. O calendário é um exemplo, não uma medição da sua recuperação; se o mesmo grupo continua dolorido ou seu desempenho caiu, ajuste o intervalo antes de repetir o estímulo.'};
}
