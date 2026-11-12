import {equipmentForDay} from './cardio-model.js';
import {compatibleExercises} from './coaching-catalog.js';
export function encodeCoachedSession(s){return{...s,prescription:encodeProgramDays([s.prescription])[0],sets:s.sets.map(r=>({count:r.items.length,items:r.items.map(e=>[e.done?'1':'0',e.completedAt??'',e.weightKg??''].join('|')).join(';')}))};}
export function decodeCoachedSession(s){return{...s,prescription:{...s.prescription,exercises:decodeProgramDays([s.prescription])[0].exercises},sets:s.sets.map(r=>({items:r.items.split(';').map(v=>{const [done,at,weight]=v.split('|');return{done:done==='1',completedAt:at||null,weightKg:weight===''?null:Number(weight)};})}))};}
import {validateProgram,encodeProgramDays,decodeProgramDays,replaceExercise} from './coaching-engine.js';
export async function saveCoachingProgram({db,uid,program,expectedRevision,doc,runTransaction,serverTimestamp,keep=false}){
 const value=validateProgram(program),ref=doc(db,'users',uid,'coaching','current');
 return runTransaction(db,async tx=>{const snap=await tx.get(ref),previous=snap.exists()?snap.data():null;
  if((previous?.revision??0)!==expectedRevision)throw Error('A ficha mudou em outro aparelho. Atualize a página antes de salvar.');
  const record={...value,days:encodeProgramDays(value.days),revision:expectedRevision+1,createdAt:keep?previous.createdAt:serverTimestamp(),reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()};
  tx.set(ref,record);return record;
 });
}
export async function createCoachedSession({db,uid,dayIndex,restOverride=null,doc,runTransaction,serverTimestamp,id=crypto.randomUUID(),now=Date.now()}){
 const ref=doc(db,'users',uid,'coachSessions',id),control=doc(db,'users',uid,'coachControl','active'),legacy=doc(db,'users',uid,'sessionControl','active'),planRef=doc(db,'users',uid,'coaching','current');
 await runTransaction(db,async tx=>{
  const [a,b,p]=await Promise.all([tx.get(control),tx.get(legacy),tx.get(planRef)]);
  if(a.exists()&&a.data().sessionId||b.exists()&&b.data().sessionId)throw Error('Retome e conclua o treino em andamento antes de iniciar outro.');
  if(!p.exists())throw Error('Preencha seu perfil para montar a ficha.');
  const program=validateProgram({...p.data(),days:decodeProgramDays(p.data().days)}),source=program.days[dayIndex];if(!source)throw Error('Treino não encontrado.');
  const prescription=structuredClone(source);
  if(restOverride!==null){if(!Number.isInteger(restOverride)||restOverride<0||restOverride>600)throw Error('Descanso inválido.');prescription.exercises.forEach(e=>e.restSeconds=restOverride);}
  const session={id,exerciseIds:prescription.exercises.map(e=>e.id),status:'active',revision:1,dayIndex,planRevision:p.data().revision,startedAt:new Date(now).toISOString(),endedAt:null,prescription,sets:prescription.exercises.map(e=>({items:Array.from({length:e.sets},()=>({done:false,completedAt:null,weightKg:null}))})),updatedAt:serverTimestamp()};
  tx.set(ref,encodeCoachedSession(session));tx.set(control,{sessionId:id,updatedAt:serverTimestamp()});
 });return id;
}
export async function editCoachedSession({db,uid,id,expectedRevision,exerciseIndex,setIndex,weightKg,finish=false,doc,runTransaction,serverTimestamp,now=Date.now()}){
 const ref=doc(db,'users',uid,'coachSessions',id),control=doc(db,'users',uid,'coachControl','active');
 return runTransaction(db,async tx=>{const [snap,pointer]=await Promise.all([tx.get(ref),tx.get(control)]);if(!snap.exists()||snap.data().status!=='active'||pointer.data()?.sessionId!==id)throw Error('Este treino não está mais ativo.');const s=decodeCoachedSession(snap.data());if(s.revision!==expectedRevision)throw Error('O treino mudou em outro aparelho. Confira os dados e tente novamente.');
  if(finish){tx.update(ref,{status:'completed',endedAt:new Date(now).toISOString(),revision:s.revision+1,updatedAt:serverTimestamp()});tx.set(control,{sessionId:'',updatedAt:serverTimestamp()});}
  else{const row=s.sets[exerciseIndex]?.items[setIndex];if(!row)throw Error('Série inválida.');if(weightKg!==null&&(!Number.isFinite(weightKg)||weightKg<0||weightKg>2000))throw Error('Informe uma carga entre 0 e 2000 kg.');row.done=!row.done;row.completedAt=row.done?new Date(now).toISOString():null;row.weightKg=weightKg;tx.update(ref,{sets:encodeCoachedSession(s).sets,revision:s.revision+1,updatedAt:serverTimestamp()});}
 });
}

export async function swapCoachedExercise({db,uid,id,exerciseIndex,newId,scope,expectedRevision,expectedPlanRevision,doc,runTransaction,serverTimestamp}){
 const ref=doc(db,'users',uid,'coachSessions',id),pRef=doc(db,'users',uid,'coaching','current');
 return runTransaction(db,async tx=>{const [snap,p]=await Promise.all([tx.get(ref),tx.get(pRef)]);if(!snap.exists()||snap.data().status!=='active'||!p.exists())throw Error('Treino ou ficha indisponível.');
 const session=decodeCoachedSession(snap.data()),program=validateProgram({...p.data(),days:decodeProgramDays(p.data().days)});
 if(session.revision!==expectedRevision||p.data().revision!==expectedPlanRevision)throw Error('Dados alterados em outro aparelho. Confira e tente novamente.');
 if(!['session','future'].includes(scope))throw Error('Escolha a duração da troca.');
 const current=session.exerciseIds[exerciseIndex];if(!compatibleExercises(current,{...program.profile,equipment:equipmentForDay(program.profile,session.dayIndex)},session.exerciseIds).some(e=>e.id===newId))throw Error('Exercício incompatível.');
 const started=session.sets[exerciseIndex].items.some(s=>s.done);
 if(started&&scope==='session')throw Error('Esta série já tem registros. Para preservá-los, escolha a troca para os próximos treinos.');
 if(scope==='future'){
  const alreadySelected=program.days[session.dayIndex]?.exercises[exerciseIndex]?.id===newId;
  const next=alreadySelected?program:replaceExercise(program,session.dayIndex,exerciseIndex,newId);
  if(!alreadySelected)tx.set(pRef,{...next,days:encodeProgramDays(next.days),revision:p.data().revision+1,createdAt:serverTimestamp(),reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});
 }
 if(!started){const exerciseIds=[...session.exerciseIds];exerciseIds[exerciseIndex]=newId;tx.update(ref,{exerciseIds,revision:session.revision+1,updatedAt:serverTimestamp()});}
 return {currentChanged:!started};
 });
}
