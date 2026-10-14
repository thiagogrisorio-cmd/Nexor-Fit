export function freshWorkout(session = crypto.randomUUID()) {
  return { session, logged: false, exercises: Array.from({length:12}, () => ({done:false, weight:''})) };
}
export function changeWorkout(current, index, field, value) {
  const next = structuredClone(current);
  if (!Number.isInteger(index) || index < 0 || index > 11 || !['done','weight'].includes(field)) throw new Error('Exercício inválido');
  if (field === 'weight' && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 2000)) throw new Error('Informe uma carga entre 0 e 2000 kg.');
  next.exercises[index][field] = field === 'done' ? !!value : String(value);
  const completed = next.exercises.every(exercise => exercise.done) && !next.logged;
  if (completed) next.logged = true;
  return {next, completed};
}
export function legacyWorkout(day, progress, sessionDone) {
  const result = freshWorkout('legacy-'+day);
  result.logged = !!sessionDone[day];
  for(let index=0;index<12;index++) {
    const old = progress[day+'-'+index] || {};
    const weight = String(old.weight ?? '');
    result.exercises[index] = {done:old.done === true,weight:weight.length <= 16 && (weight === '' || (Number.isFinite(Number(weight)) && Number(weight)>=0 && Number(weight)<=2000)) ? weight : ''};
  }
  return result;
}
