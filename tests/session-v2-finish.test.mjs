import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {planLegacySessionMigration} from '../session-v2-migration-plan.js';
import {finishV2Workout} from '../session-v2-finish.js';
const doc=(_db,...segments)=>segments.join('/');
const snap=value=>({exists:()=>value!==undefined,data:()=>value});
function fixture({missing=-1,active=true}={}){
 const session=startSession({id:'finish-v2',day:0,now:0});
 const {metadata,exercises}=planLegacySessionMigration(session);
 const writes=[];
 const tx={
  get:async path=>snap(path.endsWith('/sessionControl/active')?{sessionId:active?'finish-v2':'other'}:
   path.endsWith('/sessions/finish-v2')?metadata:
   path.includes('/exercises/')?exercises[Number(path.split('/').at(-1))]&&Number(path.split('/').at(-1))!==missing?exercises[Number(path.split('/').at(-1))]:undefined:undefined),
  update:(...args)=>writes.push(['update',...args]),
  set:(...args)=>writes.push(['set',...args])
 };
 return {tx,writes};
}
const args=tx=>({db:{},uid:'u',sessionId:'finish-v2',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'server',now:1000});
test('V2 completion atomically closes session and clears active pointer',async()=>{
 const {tx,writes}=fixture();
 const result=await finishV2Workout(args(tx));
 assert.equal(result.status,'completed');
 assert.equal(result.durationSeconds,1);
 assert.equal(writes.length,2);
 assert.equal(writes[0][2].status,'completed');
 assert.equal(writes[1][2].sessionId,'');
});
test('V2 completion rejects missing exercise and makes no writes',async()=>{
 const {tx,writes}=fixture({missing:5});
 await assert.rejects(finishV2Workout(args(tx)),/incompletos/);
 assert.equal(writes.length,0);
});
test('V2 completion rejects divergent active pointer',async()=>{
 const {tx,writes}=fixture({active:false});
 await assert.rejects(finishV2Workout(args(tx)),/divergente/);
 assert.equal(writes.length,0);
});
