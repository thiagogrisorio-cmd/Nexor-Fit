import {inspectV2RecoveryQueue} from './offline-v2-recovery-queue.js';
import {summarizeV2Recovery} from './offline-v2-recovery-summary.js';
export async function renderV2RecoveryStatus({uid,readRemoteExercise,target}){
 if(!target)return null;
 if(!uid){target.textContent='Entre na conta para consultar o diagnóstico V2.';return null;}
 target.textContent='Consultando alterações V2...';
 let report;
 try{report=await inspectV2RecoveryQueue({uid,readRemoteExercise});}
 catch(error){target.textContent='Diagnóstico V2 indisponível.';throw error;}
 const summary=summarizeV2Recovery(report);
 target.textContent=summary.total
  ?'V2 (diagnóstico): '+summary.total+' pendente(s) · '+summary.counts.retry+' apta(s) a reenvio · '+summary.counts.applied+' possível(is) confirmação(ões) · '+summary.counts.review+' revisão(ões) · '+summary.counts.conflict+' conflito(s) · '+summary.counts.unavailable+' indisponível(is)'
  :'V2 (diagnóstico): nenhuma operação pendente';
 return summary;
}
