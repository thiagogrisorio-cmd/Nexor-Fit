import {summarizeV2CompletedSets} from './session-v2-summary.js';
/** Pure planning boundary for a future privileged backend. No database writes. */
export function planCompletedV2Summary({metadata,exercises,existing}){
 if(!metadata||metadata.schemaVersion!==2||metadata.status!=='completed'||typeof metadata.id!=='string'||typeof metadata.endedAt!=='string')throw Error('Sessão V2 não concluída');
 const counts=summarizeV2CompletedSets(exercises,metadata.id);
 const summary={sessionId:metadata.id,...counts,endedAt:metadata.endedAt,day:metadata.day,durationSeconds:metadata.durationSeconds};
 if(existing){
  if(Object.keys(summary).some(key=>existing[key]!==summary[key]))throw Error('Conflito: resumo existente divergente');
  return {action:'unchanged',summary};
 }
 return {action:'create',summary};
}
