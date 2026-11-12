/** A finished session is not evidence that all its exercises were completed. */
export function projectWorkoutCard({authenticated,day,active=null,history=[],legacyCompleted=0,total=12}){
 if(!authenticated){const done=Math.max(0,Math.min(total,legacyCompleted));return {label:Math.round(100*done/total)+'%',detail:`${done} de ${total} exercícios`,percent:Math.round(100*done/total)};}
 if(active?.day===day&&Number.isInteger(active.completedExercises)&&active.totalExercises>0){
  const done=Math.max(0,Math.min(active.totalExercises,active.completedExercises)),percent=Math.round(100*done/active.totalExercises);
  return {label:'Em andamento',detail:`${done} de ${active.totalExercises} exercícios · ${percent}%`,percent};
 }
 const last=history.filter(row=>row.day===day&&Number.isFinite(Date.parse(row.endedAt))).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt))[0];
 if(last)return {label:'Concluído',detail:'Última sessão em '+new Date(last.endedAt).toLocaleDateString('pt-BR'),percent:null};
 return {label:'Iniciar',detail:`${total} exercícios · 2 séries`,percent:null};
}

export function activeWorkoutDay(session){
 return session?.status==='active'&&Number.isInteger(session.day)&&session.day>=0&&session.day<4?session.day:null;
}
