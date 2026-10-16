import {listPendingV2Edits} from './offline-v2-queue.js';
import {getReceipt} from './offline-v2-receipts.js';
import {assessPendingReceipt} from './offline-v2-recovery-assessment.js';
export async function inspectV2RecoveryQueue({uid,readRemoteExercise}){
 if(!uid||typeof readRemoteExercise!=='function')throw Error('Diagnóstico incompleto');
 const pending=await listPendingV2Edits(uid);
 const results=[];
 for(const operation of pending){
  try{
   const [receipt,remote]=await Promise.all([getReceipt(operation.id),readRemoteExercise(operation)]);
   results.push({operationId:operation.id,...assessPendingReceipt(operation,receipt,remote)});
  }catch(error){results.push({operationId:operation.id,status:'unavailable',reason:'remote-or-local-read-failed'});}
 }
 return {total:pending.length,results};
}
