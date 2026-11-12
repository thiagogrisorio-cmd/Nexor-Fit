import {EXERCISES,EQUIPMENT,exerciseById,eligible,compatibleExercises} from './coaching-catalog.js';
export const LEVELS={basic:'Básico',intermediate:'Intermediário',advanced:'Avançado'};
export const GOALS={muscle:'Ganho de massa',weight:'Apoio à perda de peso',endurance:'Resistência muscular',strength:'Força',fitness:'Condicionamento geral'};
export const FOCUSES={balanced:'Corpo todo',legs:'Pernas',glutes:'Glúteos',chest:'Peito',back:'Costas',shoulders:'Ombros',arms:'Braços'};
export function validateProfile(p){
 if(!p||!LEVELS[p.level]||!GOALS[p.goal]||!FOCUSES[p.focus]||p.adult!==true||!Number.isInteger(p.days)||p.days<2||p.days>6||![20,30,45,60,75].includes(p.minutes)||!Array.isArray(p.equipment)||p.equipment.length>Object.keys(EQUIPMENT).length||new Set(p.equipment).size!==p.equipment.length||p.equipment.some(e=>!EQUIPMENT[e]))throw Error('Revise o perfil: nível, objetivo, dias, tempo e equipamentos disponíveis.');
 return {level:p.level,goal:p.goal,focus:p.focus,adult:true,days:p.days,minutes:p.minutes,equipment:[...p.equipment].sort()};
}
export const estimateMinutes=exercises=>Math.ceil(5+exercises.reduce((s,e)=>s+e.sets*(e.reps*3+e.restSeconds)+45,0)/60);
export function generateProgram(raw,{variation=0}={}){
 const profile=validateProfile(raw),pool=EXERCISES.filter(e=>eligible(e,profile));
 const full=profile.days<=3;
 const rep=profile.goal==='endurance'?15:profile.goal==='strength'?6:profile.goal==='muscle'?10:12;
 const rest=profile.goal==='strength'?(profile.minutes<=30?90:120):profile.goal==='endurance'?45:75;
 const targetSlots=profile.minutes<=30?3:5;
 const wanted=Math.max(2,Math.min(profile.level==='basic'?2:profile.level==='intermediate'?3:4,Math.floor(((profile.minutes*60-300)/targetSlots-45)/(rep*3+rest))));
 const focusPatterns={legs:['squat','lunge'],glutes:['bridge','hinge'],chest:['push-horizontal','chest-isolation'],back:['pull-horizontal','pull-vertical'],shoulders:['push-vertical','shoulder-lateral'],arms:['elbow-flexion','elbow-extension'],balanced:[]}[profile.focus];
 const days=Array.from({length:profile.days},(_,day)=>{
  const lower=!full&&day%2===1;
  const base=full?['squat','push-horizontal','pull-horizontal','bridge','core','pull-vertical','hinge','shoulder-lateral']:lower?['squat','bridge','lunge','hinge','core','knee-flexion','calves']:['push-horizontal','pull-horizontal','pull-vertical','push-vertical','shoulder-lateral','elbow-flexion','elbow-extension','shoulder-rear'];
  const priority=focusPatterns.filter(p=>base.includes(p));
  // Keep essential movements first; rotate optional choices across sessions.
  const order=[...new Set([...base.slice(0,full?3:2),...priority,...base])];
  const chosen=[];
  for(let pattern of order){
   let options=pool.filter(e=>e.pattern===pattern&&!chosen.some(c=>c.id===e.id));
   if(!options.length&&pattern==='pull-horizontal'&&!profile.equipment.length)options=pool.filter(e=>e.pattern==='scapular');
   if(!options.length)continue;
   const e=options[(day+variation)%options.length];
   let sets=wanted;
   const row={id:e.id,sets,reps:rep,restSeconds:rest};
   while(sets>2&&estimateMinutes([...chosen,{...row,sets}])>profile.minutes)sets--;
   row.sets=sets;
   if(estimateMinutes([...chosen,row])<=profile.minutes)chosen.push(row);
   if(chosen.length===6)break;
  }
  if(chosen.length<2)throw Error('Não foi possível montar uma sessão equilibrada nesse tempo. Aumente o tempo ou revise os equipamentos.');
  return {name:'Treino '+String.fromCharCode(65+day)+' · '+(full?'Corpo todo':lower?'Inferiores':'Superiores'),exercises:chosen,estimatedMinutes:estimateMinutes(chosen)};
 });
 return {profile,days};
}
export function replaceExercise(program,day,index,newId){
 const copy=structuredClone(program),row=copy.days[day]?.exercises[index];if(!row)throw Error('Exercício indisponível.');
 const excluded=copy.days[day].exercises.map(e=>e.id);
 if(!compatibleExercises(row.id,copy.profile,excluded).some(e=>e.id===newId))throw Error('Substituição incompatível com o movimento, nível ou equipamentos.');
 row.id=newId;return copy;
}
export function reviewStatus(program,now=Date.now()){
 const created=program?.createdAt?.toMillis?.()??Date.parse(program?.createdAt);
 const reviewed=program?.reviewedAt?.toMillis?.()??Date.parse(program?.reviewedAt);
 const start=Number.isFinite(reviewed)?reviewed:created;
 return {due:Number.isFinite(start)&&now-start>=90*86400000,ageDays:Number.isFinite(created)?Math.max(0,Math.floor((now-created)/86400000)):0};
}
export function validateProgram(p){
 const profile=validateProfile(p.profile);if(!Array.isArray(p.days)||p.days.length!==profile.days)throw Error('Dias da ficha inválidos.');
 for(const day of p.days){if(!day.name||day.name.length>80||!Array.isArray(day.exercises)||day.exercises.length<2||day.exercises.length>6||new Set(day.exercises.map(e=>e.id)).size!==day.exercises.length)throw Error('Ficha inválida.');for(const e of day.exercises)if(!exerciseById(e.id)||!eligible(exerciseById(e.id),profile)||!Number.isInteger(e.sets)||e.sets<2||e.sets>4||!Number.isInteger(e.reps)||e.reps<6||e.reps>20||!Number.isInteger(e.restSeconds)||e.restSeconds<0||e.restSeconds>180)throw Error('Exercício inválido.');if(day.estimatedMinutes!==estimateMinutes(day.exercises)||day.estimatedMinutes>profile.minutes)throw Error('Duração incompatível com o perfil.');}
 return {profile,days:structuredClone(p.days)};
}

export const encodeProgramDays=days=>days.map(d=>({...d,exerciseCount:d.exercises.length,exercises:d.exercises.map(e=>[e.id,e.sets,e.reps,e.restSeconds].join('|')).join(';')}));
export const decodeProgramDays=days=>days.map(d=>{const {exerciseCount,...rest}=d;return{...rest,exercises:d.exercises.split(';').map(value=>{const [id,sets,reps,restSeconds]=value.split('|');return{id,sets:Number(sets),reps:Number(reps),restSeconds:Number(restSeconds)};})};});
