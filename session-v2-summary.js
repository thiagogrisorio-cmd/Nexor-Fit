/** Pure summary of a complete V2 exercise snapshot. Never trust a client-provided count. */
export function summarizeV2CompletedSets(exercises,sessionId){
 if(!Array.isArray(exercises)||exercises.length!==12||!sessionId)throw Error('Exercícios V2 incompletos');
 const indices=new Set();
 let completedSets=0;
 for(const exercise of exercises){
  if(!exercise||!Number.isInteger(exercise.index)||exercise.index<0||exercise.index>11||indices.has(exercise.index)||exercise.sessionId!==sessionId||!Array.isArray(exercise.sets)||exercise.sets.length!==2)throw Error('Exercício V2 inválido');
  indices.add(exercise.index);
  for(const set of exercise.sets){
   if(!set||typeof set.done!=='boolean'||!(set.completedAt===null||typeof set.completedAt==='string'))throw Error('Série V2 inválida');
   if(set.done)completedSets++;
  }
 }
 return {completedSets,totalSets:24};
}
