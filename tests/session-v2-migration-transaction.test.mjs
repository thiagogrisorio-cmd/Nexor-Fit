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
 const tx={get:async path=>snapshot(path==='users/u/sessions/migration-conflict'?original:path==='users/u/sessionBackups/migration-conflict'?{original}:undefined),set:(...args)=>writes.push(args)};
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
