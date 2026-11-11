import test from 'node:test';
import assert from 'node:assert/strict';
import {watchExerciseRevisions} from '../session-exercise-live.js';
test('remote child revisions refresh once per burst and unsubscribe on account/session change',()=>{
 const listeners=[],pending=new Map();let ticks=0,changed=0,unsubscribed=0;
 const stop=watchExerciseRevisions({db:{},uid:'owner',sessionId:'s',doc:(_,...parts)=>parts.join('/'),onSnapshot:(ref,callback)=>{listeners.push(callback);return ()=>unsubscribed++},onChange:()=>changed++,schedule:callback=>{pending.set(++ticks,callback);return ticks},cancel:id=>pending.delete(id)});
 const snapshot=(revision,pending=false)=>({exists:()=>true,data:()=>({revision}),metadata:{hasPendingWrites:pending}});
 listeners.forEach(callback=>callback(snapshot(0)));assert.equal(changed,0);assert.equal(pending.size,0);
 listeners[0](snapshot(1,true));assert.equal(pending.size,0);
 listeners[0](snapshot(1));listeners[1](snapshot(1));assert.equal(pending.size,1);
 [...pending.values()][0]();pending.clear();assert.equal(changed,1);
 stop();assert.equal(unsubscribed,12);listeners[0](snapshot(2));assert.equal(pending.size,0);
});
