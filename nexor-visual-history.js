/** Read-only history projection for isolated NEXOR FIT visual previews. */
export function summarizeWorkoutHistory(sessions){
 if(!Array.isArray(sessions))throw Error('Histórico inválido');
 const rows=sessions.map((session,index)=>{
  if(!session||typeof session.id!=='string'||!session.id.trim()||
   typeof session.name!=='string'||!session.name.trim()||
   !Number.isFinite(session.endedAt)||session.endedAt<0||
   !Number.isFinite(session.durationSeconds)||session.durationSeconds<0||
   !Array.isArray(session.exercises))throw Error('Sessão histórica inválida');
  let totalSets=0,completedSets=0,volumeKg=0;
  session.exercises.forEach(exercise=>{
   if(!exercise||!Array.isArray(exercise.sets))throw Error('Exercício histórico inválido');
   exercise.sets.forEach(set=>{
    if(!set||typeof set.done!=='boolean'||(set.weightKg!==undefined&&(!Number.isFinite(set.weightKg)||set.weightKg<0))||
      (set.repetitions!==undefined&&(!Number.isInteger(set.repetitions)||set.repetitions<0)))
      throw Error('Série histórica inválida');
    totalSets++;
    if(set.done){completedSets++;volumeKg+=(set.weightKg??0)*(set.repetitions??0)}
   });
  });
  return {id:session.id,name:session.name,endedAt:session.endedAt,durationSeconds:session.durationSeconds,
   exerciseCount:session.exercises.length,totalSets,completedSets,volumeKg,index};
 });
 rows.sort((a,b)=>b.endedAt-a.endedAt||a.index-b.index);
 return rows.map(({index,...row})=>row);
}
export function summarizeWorkoutEvolution(history){
 const rows=summarizeWorkoutHistory(history);
 const chronological=[...rows].reverse();
 return {sessions:rows.length,totalCompletedSets:rows.reduce((sum,row)=>sum+row.completedSets,0),
  totalDurationSeconds:rows.reduce((sum,row)=>sum+row.durationSeconds,0),
  totalVolumeKg:rows.reduce((sum,row)=>sum+row.volumeKg,0),
  trend:chronological.map(row=>({id:row.id,endedAt:row.endedAt,completedSets:row.completedSets,volumeKg:row.volumeKg}))};
}
