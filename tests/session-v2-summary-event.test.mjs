import test from 'node:test';
import assert from 'node:assert/strict';
import {processV2CompletionEvent} from '../session-v2-summary-event.js';
const store={};
test('ignores non-V2 or active completion events',async()=>{
 assert.deepEqual(await processV2CompletionEvent({store,event:{uid:'user',sessionId:'id',after:{id:'id',schemaVersion:1,status:'completed'}}}),{action:'ignored',reason:'not-completed-v2'});
 assert.equal((await processV2CompletionEvent({store,event:{uid:'user',sessionId:'id',after:{id:'id',schemaVersion:2,status:'active'}}})).action,'ignored');
});
test('ignores repeated completed-to-completed update',async()=>{
 const event={uid:'user',sessionId:'id',before:{status:'completed'},after:{id:'id',schemaVersion:2,status:'completed'}};
 assert.deepEqual(await processV2CompletionEvent({store,event}),{action:'ignored',reason:'already-completed'});
});
test('rejects path traversal identifiers',async()=>{
 await assert.rejects(processV2CompletionEvent({store,event:{uid:'user/other',sessionId:'id',after:{id:'id',schemaVersion:2,status:'completed'}}}),/Identificadores/);
 await assert.rejects(processV2CompletionEvent({store,event:{uid:'user',sessionId:'../other',after:{id:'../other',schemaVersion:2,status:'completed'}}}),/Identificadores/);
});
