import {executeV2Summary} from './session-v2-summary-executor.js';
/** Invoke only from an authenticated backend event handler, never from browser code. */
export async function processV2CompletionEvent({store,event}){
 if(!store||!event||typeof event!=='object')throw Error('Evento inválido');
 const {uid,sessionId,before,after}=event;
 if(typeof uid!=='string'||!uid||uid.includes('/')||typeof sessionId!=='string'||!(/^[A-Za-z0-9-]{1,64}$/).test(sessionId))throw Error('Identificadores inválidos');
 if(!after||after.schemaVersion!==2||after.id!==sessionId||after.status!=='completed')return {action:'ignored',reason:'not-completed-v2'};
 if(before?.status==='completed')return {action:'ignored',reason:'already-completed'};
 return executeV2Summary({store,uid,sessionId});
}
