/** Isolated preview-only exercise form validation; never writes workout history. */
export function assessExerciseSetDraft({exercise,setIndex,weightKg,repetitions}){
 if(!exercise||typeof exercise!=='object'||!Number.isInteger(exercise.sets)||exercise.sets<1||exercise.sets>12)
  return {valid:false,reason:'invalid-exercise'};
 if(!Number.isInteger(setIndex)||setIndex<0||setIndex>=exercise.sets)
  return {valid:false,reason:'invalid-set-index'};
 if(typeof weightKg!=='number'||!Number.isFinite(weightKg)||weightKg<0||weightKg>2000)
  return {valid:false,reason:'invalid-weight'};
 if(!Number.isInteger(repetitions)||repetitions<0||repetitions>1000)
  return {valid:false,reason:'invalid-repetitions'};
 return {valid:true,setIndex,weightKg,repetitions};
}
