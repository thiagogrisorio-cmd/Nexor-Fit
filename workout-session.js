// Workout session timing and per-set tracking. Pure functions, testable in Node.
export function startSession({day, restSeconds=90, exerciseCount=12, setsPerExercise=2, now=Date.now(), id=crypto.randomUUID()}={}) {
 if(!Number.isInteger(day)||day<0||day>3)throw Error('Treino inválido');
 if(!Number.isInteger(restSeconds)||restSeconds<0||restSeconds>600)throw Error('Intervalo inválido');
 if(!Number.isInteger(exerciseCount)||exerciseCount<1||exerciseCount>100)throw Error('Exercícios inválidos');
 if(!Number.isInteger(setsPerExercise)||setsPerExercise<1||setsPerExercise>12)throw Error('Séries inválidas');
 return {id,day,status:'active',startedAt:new Date(now).toISOString(),endedAt:null,restSeconds,restUntil:null,sets:Array.from({length:exerciseCount},()=>Array.from({length:setsPerExercise},()=>({done:false,completedAt:null})))};
}
export function markSet(session,exercise,set,done=true,now=Date.now()){
 if(session.status!=='active')throw Error('Sessão não está ativa');
 if(!session.sets[exercise]?.[set])throw Error('Série inválida');
 const next=structuredClone(session);
 next.sets[exercise][set]={done:!!done,completedAt:done?new Date(now).toISOString():null};
 next.restUntil=done&&next.restSeconds>0?new Date(now+next.restSeconds*1000).toISOString():null;
 return next;
}
export function finishSession(session,now=Date.now()){
 if(session.status!=='active')throw Error('Sessão já encerrada');
 const endedAt=new Date(now).toISOString(),durationSeconds=Math.max(0,Math.floor((now-Date.parse(session.startedAt))/1000));
 return {...structuredClone(session),status:'completed',endedAt,durationSeconds,restUntil:null};
}
export function sessionProgress(session){
 const total=session.sets.reduce((n,sets)=>n+sets.length,0);
 const done=session.sets.flat().filter(set=>set.done).length;
 return {done,total,percent:total?Math.round(done/total*100):0};
}
export function remainingRest(session,now=Date.now()){
 return session.restUntil?Math.max(0,Math.ceil((Date.parse(session.restUntil)-now)/1000)):0;
}
