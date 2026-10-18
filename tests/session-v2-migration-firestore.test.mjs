import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,runTransaction,serverTimestamp,deleteField} from 'firebase/firestore';
import {startSession} from '../workout-session.js';
import {encodeSessionForFirestore} from '../firestore-session-codec.js';
import {migrateLegacySessionAtomically} from '../session-v2-migration-transaction.js';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-v2-backup',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
test('atomic migration keeps immutable V1 backup and creates 12 V2 children',async()=>{
 const uid='backup-owner',id='backup-session',db=env.authenticatedContext(uid).firestore();
 const original=startSession({id,day:0,now:0});
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessions',id),{...encodeSessionForFirestore(original),updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessionControl','active'),{sessionId:id,updatedAt:serverTimestamp()}));
 const result=await assertSucceeds(migrateLegacySessionAtomically({db,uid,sessionId:id,doc,runTransaction,serverTimestamp}));
 assert.equal(result.status,'migrated');
 const backup=doc(db,'users',uid,'sessionBackups',id);
 const saved=await assertSucceeds(getDoc(backup));
 assert.equal(saved.data().original.id,id);
 assert.equal((await getDoc(doc(db,'users',uid,'sessions',id))).data().schemaVersion,2);
 for(let i=0;i<12;i++)assert.equal((await getDoc(doc(db,'users',uid,'sessions',id,'exercises',String(i)))).data().index,i);
 await assertFails(updateDoc(backup,{sessionId:'changed'}));
 await assertFails(deleteDoc(backup));
 await assertFails(getDoc(doc(env.authenticatedContext('other-user').firestore(),'users',uid,'sessionBackups',id)));
});

test('atomic migration refuses stale control pointer without backup or V2 writes',async()=>{
 const uid='stale-owner',id='stale-session',db=env.authenticatedContext(uid).firestore();
 const original=startSession({id,day:0,now:0});
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessions',id),{...encodeSessionForFirestore(original),updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessionControl','active'),{sessionId:'another-session',updatedAt:serverTimestamp()}));
 const result=await migrateLegacySessionAtomically({db,uid,sessionId:id,doc,runTransaction,serverTimestamp});
 assert.equal(result.status,'conflict');
 assert.equal(result.reason,'not-active-session');
 assert.equal((await getDoc(doc(db,'users',uid,'sessionBackups',id))).exists(),false);
 assert.equal((await getDoc(doc(db,'users',uid,'sessions',id))).data().schemaVersion,undefined);
 assert.equal((await getDoc(doc(db,'users',uid,'sessions',id,'exercises','0'))).exists(),false);
});

test('V1 to V2 parent conversion without immutable backup is rejected',async()=>{
 const uid='no-backup-owner',id='no-backup-session',db=env.authenticatedContext(uid).firestore();
 const original=startSession({id,day:0,now:0});
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessions',id),{...encodeSessionForFirestore(original),updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db,'users',uid,'sessions',id),{schemaVersion:2,sets:deleteField(),updatedAt:serverTimestamp()}));
 const saved=await assertSucceeds(getDoc(doc(db,'users',uid,'sessions',id)));
 assert.equal(saved.data().schemaVersion,undefined);
 assert.ok(Array.isArray(saved.data().sets));
});

test('V2 parent cannot be downgraded to legacy V1',async()=>{
 const uid='downgrade-owner',id='downgrade-session',db=env.authenticatedContext(uid).firestore();
 const original=startSession({id,day:0,now:0});
 const legacy={...encodeSessionForFirestore(original),updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessions',id),{
  id,day:0,status:'active',startedAt:original.startedAt,restSeconds:original.restSeconds,schemaVersion:2,updatedAt:serverTimestamp()
 }));
 await assertFails(setDoc(doc(db,'users',uid,'sessions',id),legacy));
 const saved=await assertSucceeds(getDoc(doc(db,'users',uid,'sessions',id)));
 assert.equal(saved.data().schemaVersion,2);
});

test('owner cannot forge a migration backup against an unrelated V2 parent',async()=>{
 const uid='forged-backup-owner',id='forged-backup-session',db=env.authenticatedContext(uid).firestore();
 const original=startSession({id,day:0,now:0});
 await assertSucceeds(setDoc(doc(db,'users',uid,'sessions',id),{
  id,day:0,status:'active',startedAt:original.startedAt,restSeconds:original.restSeconds,
  schemaVersion:2,updatedAt:serverTimestamp()
 }));
 await assertFails(setDoc(doc(db,'users',uid,'sessionBackups',id),{
  sessionId:id,original:encodeSessionForFirestore(original),createdAt:serverTimestamp()
 }));
 const backup=await assertSucceeds(getDoc(doc(db,'users',uid,'sessionBackups',id)));
 assert.equal(backup.exists(),false);
});
