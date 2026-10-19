/** Pure view-model for the isolated Nexor Fit 2.0 workout previews. */
export function workoutPreviewProgress({exercises,sets,elapsedSeconds=0}){
 if(!Array.isArray(exercises)||!Array.isArray(sets)||exercises.length!==sets.length)
  throw Error('Exercícios e séries inconsistentes');
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw Error('Tempo inválido');
 let totalSets=0,completedSets=0,completedExercises=0;
 exercises.forEach((exercise,index)=>{
  if(!exercise||!Number.isInteger(exercise.sets)||exercise.sets<1||exercise.sets>12)
   throw Error('Quantidade de séries inválida');
  const row=sets[index];
  if(!Array.isArray(row)||row.length!==exercise.sets)
   throw Error('Séries incompatíveis com a prescrição');
  row.forEach(item=>{
   if(!item||typeof item.done!=='boolean')throw Error('Estado de série inválido');
   if(item.done)completedSets++;
  });
  totalSets+=row.length;
  if(row.every(item=>item.done))completedExercises++;
 });
 return {
  totalExercises:exercises.length,completedExercises,totalSets,completedSets,
  percent:totalSets===0?0:Math.round(100*completedSets/totalSets),
  elapsedSeconds:Math.floor(elapsedSeconds)
 };
}
