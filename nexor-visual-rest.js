/** Pure rest timer calculations for isolated visual previews. */
export function validateRestDuration(seconds){
 if(!Number.isInteger(seconds)||seconds<0||seconds>600)throw Error('Descanso inválido');
 return seconds;
}
export function restTimerState({durationSeconds,elapsedSeconds}){
 validateRestDuration(durationSeconds);
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw Error('Tempo decorrido inválido');
 const remainingSeconds=Math.max(0,Math.ceil(durationSeconds-elapsedSeconds));
 return {durationSeconds,remainingSeconds,finished:remainingSeconds===0,
  progressPercent:durationSeconds===0?100:Math.min(100,Math.round(100*(durationSeconds-remainingSeconds)/durationSeconds))};
}
export function adjustRestDuration({durationSeconds,elapsedSeconds,deltaSeconds}){
 validateRestDuration(durationSeconds);
 if(!Number.isInteger(deltaSeconds))throw Error('Ajuste inválido');
 if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0)throw Error('Tempo decorrido inválido');
 return validateRestDuration(Math.max(0,Math.min(600,durationSeconds+deltaSeconds)));
}
