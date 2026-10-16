import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {stageV2SessionCreate} from '../session-v2-transaction.js';
test('V2 stages one metadata and twelve exercise documents',()=>{
 const writes=[];
 const transaction={set:(ref,value)=>writes.push({ref,value})};
 const refs=Array.from({length:12},(_,i)=>'exercise-'+i);
 const result=stageV2SessionCreate(transaction,{session:startSession({id:'sample',day:0,now:0}),sessionRef:'parent',exerciseRefs:refs,serverTimestamp:()=>123});
 assert.equal(result.exerciseCount,12);
 assert.equal(writes.length,13);
 assert.equal(writes[0].value.schemaVersion,2);
 assert.equal('sets' in writes[0].value,false);
 assert.ok(writes.slice(1).every((write,i)=>write.value.index===i&&write.value.sets.length===2));
});
