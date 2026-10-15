import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession,markSet,finishSession,sessionProgress,remainingRest} from '../workout-session.js';
test('starts, marks sets and counts rest from timestamps',()=>{
 const start=Date.parse('2026-10-15T12:00:00Z');
 const a=startSession({day:0,now:start,id:'one',restSeconds:90,exerciseCount:2,setsPerExercise:3});
 assert.equal(sessionProgress(a).total,6);
 const b=markSet(a,0,0,true,start+10000);
 assert.equal(sessionProgress(b).done,1);
 assert.equal(sessionProgress(a).done,0);
 assert.equal(remainingRest(b,start+40000),60);
 assert.equal(remainingRest(b,start+100000),0);
 const c=finishSession(b,start+120000);
 assert.equal(c.durationSeconds,120);
 assert.equal(c.status,'completed');
 assert.throws(()=>markSet(c,0,1));
 assert.throws(()=>finishSession(c));
});
test('rejects invalid intervals and indices',()=>{
 assert.throws(()=>startSession({day:0,restSeconds:-1}));
 assert.throws(()=>markSet(startSession({day:1}),99,0));
});
