import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {encodeSessionForFirestore} from '../firestore-session-codec.js';
import {migrateLegacySessionAtomically} from '../session-v2-migration-transaction.js';
const doc=(_db,...segments)=>segments.join('/');
const snapshot=value=>({exists:()=>value!==undefined,data:()=>value});
test('migration stages backup, parent and 12 exercises atomically',async()=>{
 const original={...encodeSessionForFirestore(startSession({id:'migration-atomic',day:0,now:0})),updatedAt:'old'};
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/migration-atomic'?original:path==='users/u/sessionControl/active'?{sessionId:'migration-atomic'}:undefined),set:(path,data)=>writes.push({path,data})};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'migration-atomic',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'server-time'});
 assert.equal(result.status,'migrated');
 assert.equal(writes.length,14);
 assert.deepEqual(writes.find(x=>x.path==='users/u/sessionBackups/migration-atomic').data.original,original);
 assert.equal(writes.filter(x=>x.path.includes('/exercises/')).length,12);
 assert.equal(writes.find(x=>x.path==='users/u/sessions/migration-atomic').data.schemaVersion,2);
});
test('migration refuses existing backup without writing anything',async()=>{
 const original=encodeSessionForFirestore(startSession({id:'migration-conflict',day:0,now:0}));
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/migration-conflict'?original:path==='users/u/sessionBackups/migration-conflict'?{original}:path==='users/u/sessionControl/active'?{sessionId:'migration-conflict'}:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'migration-conflict',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.status,'conflict');
 assert.equal(writes.length,0);
});

test('migration rejects a stale active pointer without writing',async()=>{
 const original=encodeSessionForFirestore(startSession({id:'stale-migration',day:0,now:0}));
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/stale-migration'?original:path==='users/u/sessionControl/active'?{sessionId:'different'}:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'stale-migration',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.status,'conflict');
 assert.equal(result.reason,'not-active-session');
 assert.equal(writes.length,0);
});
test('migration rejects completed legacy sessions without writing',async()=>{
 const original={...encodeSessionForFirestore(startSession({id:'completed-migration',day:0,now:0})),status:'completed'};
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/completed-migration'?original:path==='users/u/sessionControl/active'?{sessionId:'completed-migration'}:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'completed-migration',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.status,'conflict');
 assert.equal(writes.length,0);
});

test('migration rejects mismatched source document ID',async()=>{
 const original=encodeSessionForFirestore(startSession({id:'wrong-source',day:0,now:0}));
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/target-session'?original:path==='users/u/sessionControl/active'?{sessionId:'target-session'}:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'target-session',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.reason,'session-id-mismatch');
 assert.equal(writes.length,0);
});
test('migration does not report success for incomplete V2 children',async()=>{
 const original={...encodeSessionForFirestore(startSession({id:'partial-v2',day:0,now:0})),schemaVersion:2};
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/partial-v2'?original:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'partial-v2',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.reason,'incomplete-v2-migration');
 assert.equal(writes.length,0);
});
test('migration recognizes a complete native V2 without backup',async()=>{
 const original={...encodeSessionForFirestore(startSession({id:'native-v2',day:0,now:0})),schemaVersion:2};
 const writes=[];
 const tx={get:async path=>snapshot(path==='users/u/sessions/native-v2'?original:path.startsWith('users/u/sessions/native-v2/exercises/')?{index:Number(path.split('/').at(-1))}:undefined),set:(...args)=>writes.push(args)};
 const result=await migrateLegacySessionAtomically({db:{},uid:'u',sessionId:'native-v2',doc,runTransaction:async(_db,fn)=>fn(tx),serverTimestamp:()=> 'now'});
 assert.equal(result.status,'already-v2');
 assert.equal(writes.length,0);
});
