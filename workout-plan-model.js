/** Nexor Fit 2.0: optional dynamic plan contract. No persistence or migration. */
const text=(s,label)=>{if(typeof s!=='string'||!s.trim()||s.length>128)throw Error(label+' inválido');return s.trim()};
export function validateWorkoutPlan(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Plano inválido');
 const id=text(p.id,'ID'),name=text(p.name,'Nome');
 if(!['manual','recommended','example'].includes(p.origin))throw Error('Origem inválida');
 if(!Array.isArray(p.exercises)||p.exercises.length<1||p.exercises.length>100)throw Error('Exercícios inválidos');
 const ids=new Set();
 const exercises=p.exercises.map((e,i)=>{
  if(!e||typeof e!=='object')throw Error('Exercício inválido');
  const eid=text(e.id,'ID do exercício');
  if(ids.has(eid))throw Error('Exercício duplicado');
  ids.add(eid);
  if(!Number.isInteger(e.sets)||e.sets<1||e.sets>12)throw Error('Séries inválidas');
  const restSeconds=e.restSeconds??90;
  if(!Number.isInteger(restSeconds)||restSeconds<0||restSeconds>600)throw Error('Descanso inválido');
  return {id:eid,name:text(e.name,'Exercício'),muscleGroup:text(e.muscleGroup,'Grupo muscular'),sets:e.sets,reps:text(e.reps,'Repetições'),restSeconds,order:i};
 });
 const revision=p.revision??1;
 if(!Number.isInteger(revision)||revision<1)throw Error('Revisão inválida');
 return {id,name,origin:p.origin,revision,exercises};
}
export function reviseWorkoutPlan(plan,changes){
 const previous=validateWorkoutPlan(plan);
 if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('Alterações inválidas');
 if(Object.hasOwn(changes,'id')&&changes.id!==previous.id)throw Error('ID imutável');
 if(Object.hasOwn(changes,'origin')&&changes.origin!==previous.origin)throw Error('Origem imutável');
 return validateWorkoutPlan({...previous,...changes,revision:previous.revision+1});
}
export function snapshotWorkoutPrescription(plan){return structuredClone(validateWorkoutPlan(plan))}
export function archiveWorkoutPlan(plan){return {...validateWorkoutPlan(plan),archived:true}}
