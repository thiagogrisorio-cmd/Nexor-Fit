/** Read-only progression model for isolated Nexor Fit 2.0 visual previews. */
export function assessExerciseTransition({exercises,sets,currentIndex}){
 if(!Array.isArray(exercises)||exercises.length===0||!Array.isArray(sets)||sets.length!==exercises.length)
  return {action:'invalid',reason:'invalid-workout'};
 if(!Number.isInteger(currentIndex)||currentIndex<0||currentIndex>=exercises.length)
  return {action:'invalid',reason:'invalid-index'};
 for(let i=0;i<exercises.length;i++){
  const exercise=exercises[i],row=sets[i];
  if(!exercise||typeof exercise.name!=='string'||!exercise.name.trim()||
   !Number.isInteger(exercise.sets)||exercise.sets<1||exercise.sets>12||
   !Array.isArray(row)||row.length!==exercise.sets||
   !row.every(s=>s&&typeof s.done==='boolean'))
   return {action:'invalid',reason:'invalid-prescription'};
 }
 if(!sets[currentIndex].every(s=>s.done))return {action:'incomplete',currentIndex};
 const nextIndex=currentIndex+1;
 if(nextIndex>=exercises.length)return {action:'workout-complete',completedIndex:currentIndex};
 const next=exercises[nextIndex];
 return {action:'next-exercise',completedIndex:currentIndex,nextIndex,nextExercise:{name:next.name,sets:next.sets,reps:next.reps??'',restSeconds:next.restSeconds??90}};
}
