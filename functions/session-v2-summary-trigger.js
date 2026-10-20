import {processV2CompletionEvent} from './session-v2-summary-event.js';
/** Attach this handler to a trusted Firestore document-updated trigger. */
export function createV2SummaryTriggerHandler({store,logger=console}){
 if(!store||typeof store.runTransaction!=='function')throw Error('Firestore Admin indisponível');
 return async function handleSessionUpdate(event){
  const params=event?.params||{};
  const before=event?.data?.before?.data?.();
  const after=event?.data?.after?.data?.();
  const result=await processV2CompletionEvent({store,event:{uid:params.uid,sessionId:params.sessionId,before,after}});
  logger.info?.('nexor-v2-summary',{uid:params.uid,sessionId:params.sessionId,action:result.action});
  return result;
 };
}
