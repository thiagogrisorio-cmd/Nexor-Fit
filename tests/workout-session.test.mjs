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

test('undo restores incomplete state and stops rest timer',()=>{
 const a=startSession({day:2,id:'undo',now:1000,restSeconds:60});
 const b=markSet(a,0,0,true,2000);
 assert.equal(remainingRest(b,12000),50);
 const c=markSet(b,0,0,false,13000);
 assert.equal(sessionProgress(c).done,0);
 assert.equal(c.sets[0][0].completedAt,null);
 assert.equal(remainingRest(c,13000),0);
});
test('partial workout keeps accurate duration and set count',()=>{
 const a=startSession({day:3,id:'partial',now:1000});
 const b=markSet(a,2,1,true,2000);
 const c=finishSession(b,61000);
 assert.equal(c.durationSeconds,60);
 assert.equal(sessionProgress(c).done,1);
 assert.equal(sessionProgress(c).total,24);
 assert.equal(c.restUntil,null);
});

test('legacy set toggle preserves optional weight and never mutates the original session',async()=>{
 const {startSession,markSet}=await import('../workout-session.js');
 const initial=startSession({id:'weight-preservation',day:0,now:0});
 initial.sets[0][0].weightKg=25;
 const done=markSet(initial,0,0,true,1000);
 assert.equal(done.sets[0][0].weightKg,25);
 assert.equal(initial.sets[0][0].done,false);
 const undone=markSet(done,0,0,false,2000);
 assert.equal(undone.sets[0][0].weightKg,25);
 assert.equal(undone.sets[0][0].completedAt,null);
});
