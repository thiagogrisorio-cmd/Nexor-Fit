import {decodeSessionFromFirestore} from './firestore-session-codec.js';
import {joinSessionExercises} from './session-exercise-schema-v2.js';

/**
 * Pure, read-only compatibility boundary for the workout UI.
 * Rejects partial V2 data rather than falling back to stale V1 state.
 */
export function decodeWorkoutForUI({metadata,exerciseDocuments}){
 if(!metadata||typeof metadata!=='object'||!metadata.id)throw Error('Sessão ausente');
 if(metadata.schemaVersion===2){
  if(Object.hasOwn(metadata,'sets'))throw Error('Sessão V2 contém séries legadas');
  if(!Array.isArray(exerciseDocuments)||exerciseDocuments.length!==12)
   throw Error('Exercícios V2 ainda não carregados');
  const {schemaVersion,updatedAt,...rest}=metadata;
  const session=joinSessionExercises(rest,exerciseDocuments);
  return {format:'v2',session,readOnly:true};
 }
 if(Object.hasOwn(metadata,'schemaVersion'))throw Error('Versão de sessão desconhecida');
 const session=decodeSessionFromFirestore(metadata);
 if(session.sets.length!==12||session.sets.some(row=>row.length!==2||
   row.some(set=>typeof set?.done!=='boolean'||(set.completedAt!==null&&typeof set.completedAt!=='string'))))
  throw Error('Sessão V1 inválida');
 return {format:'v1',session,readOnly:false};
}

/**
 * Read-only UI projection. Never persists defaults or changes the V1/V2 source.
 * The prescribed workout catalogue remains outside this session-data adapter.
 */
export function projectWorkoutForUI(decoded){
 if(!decoded||!['v1','v2'].includes(decoded.format)||!decoded.session?.id)
  throw Error('Sessão compatível ausente');
 const source=decoded.session;
 if(!Array.isArray(source.sets)||source.sets.length!==12||
    source.sets.some(row=>!Array.isArray(row)||row.length!==2))
  throw Error('Séries incompletas');
 const exercises=source.sets.map((row,exerciseIndex)=>({
  index:exerciseIndex,
  sets:row.map((set,setIndex)=>{
   if(typeof set?.done!=='boolean'||!(set.completedAt===null||typeof set.completedAt==='string'))
    throw Error('Série inválida');
   const weightKg=set.weightKg;
   if(weightKg!==undefined&&(typeof weightKg!=='number'||!Number.isFinite(weightKg)||weightKg<0||weightKg>2000))
    throw Error('Carga inválida');
   return {index:setIndex,done:set.done,completedAt:set.completedAt,weightKg:weightKg??null};
  })
 }));
 const completedSets=exercises.reduce((n,row)=>n+row.sets.filter(set=>set.done).length,0);
 return {
  id:source.id,day:source.day,status:source.status,sourceFormat:decoded.format,
  startedAt:source.startedAt,endedAt:source.endedAt??null,
  restSeconds:source.restSeconds??90,restUntil:source.restUntil??null,
  durationSeconds:source.durationSeconds??null,
  exercises,progress:{completedSets,totalSets:24,percent:Math.round(completedSets/24*100)}
 };
}
