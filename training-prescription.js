const field=(value,max,label)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max||/[|\r\n]/.test(value))throw Error(label+' inválido');
 return value.trim();
};
export function encodePrescriptionExercise({group,name,reps}){
 return [field(group,40,'Grupo'),field(name,120,'Exercício'),field(reps,40,'Repetições')].join('|');
}
export function validatePrescription(exercises){
 if(!Array.isArray(exercises)||exercises.length!==12)throw Error('O treino deve ter 12 exercícios');
 return exercises.map(value=>{
  if(typeof value!=='string')throw Error('Exercício inválido');
  const parts=value.split('|');if(parts.length!==3)throw Error('Exercício inválido');
  return encodePrescriptionExercise({group:parts[0],name:parts[1],reps:parts[2]});
 });
}
export function validateTrainingPlan(plan){
 if(!plan||!Number.isInteger(plan.revision)||plan.revision<1||plan.revision>1000000000)throw Error('Revisão inválida');
 return {revision:plan.revision,focus:field(plan.focus,120,'Ênfase'),exercises:validatePrescription(plan.exercises)};
}
export function prescriptionExercise(prescription,index,defaults){
 return (prescription||defaults)[index];
}
export function exerciseIdentity(encoded){return encoded.split('|')[1].normalize('NFKC').trim().toLocaleLowerCase('pt-BR');}
export function projectLoadTrend(rows){
 return rows.filter(row=>Number.isFinite(row.at)&&Array.isArray(row.sets))
  .map(row=>({...row,weights:row.sets.filter(set=>set.done&&typeof set.weightKg==='number'&&Number.isFinite(set.weightKg)&&set.weightKg>=0).map(set=>set.weightKg)}))
  .filter(row=>row.weights.length).map(row=>({id:row.id,at:row.at,weight:Math.max(...row.weights)}))
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
