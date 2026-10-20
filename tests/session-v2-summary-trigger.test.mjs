import test from 'node:test';
import assert from 'node:assert/strict';
import {createV2SummaryTriggerHandler} from '../session-v2-summary-trigger.js';
const store={runTransaction:async()=>{throw Error('Should not run');}};
test('Firestore trigger ignores non-completion changes and logs result',async()=>{
 const events=[];
 const handler=createV2SummaryTriggerHandler({store,logger:{info:(message,data)=>events.push({message,data})}});
 const result=await handler({params:{uid:'user',sessionId:'session'},data:{before:{data:()=>({status:'active'})},after:{data:()=>({id:'session',schemaVersion:2,status:'active'})}}});
 assert.equal(result.action,'ignored');
 assert.equal(events.length,1);
 assert.equal(events[0].data.action,'ignored');
});
