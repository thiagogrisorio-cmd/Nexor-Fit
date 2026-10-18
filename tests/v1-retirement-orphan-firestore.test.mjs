import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFirestoreSessionOrphans} from '../v1-retirement-orphan-firestore.js';
const docs=['users/a/sessions/one','users/a/sessions/two','users/b/sessions/three'].map(path=>({ref:{path}}));
test('counts missing owners once and hides IDs',async()=>{
 let checked=0;
 const db={collectionGroup:()=>({orderBy:()=>({limit:size=>({get:async()=>({docs:docs.slice(0,size)}),startAfter:last=>({get:async()=>({docs:docs.slice(docs.indexOf(last)+1,docs.indexOf(last)+1+size)})})})})})};
 const auth={getUser:async uid=>{checked++;if(uid==='b')throw Object.assign(new Error('missing'),{code:'auth/user-not-found'});return {uid};}};
 const report=await auditFirestoreSessionOrphans({db,auth,pageSize:2});
 assert.equal(report.sessionDocuments,3);
 assert.equal(report.ownersScanned,2);
 assert.equal(report.orphanOwners,1);
 assert.equal(report.complete,true);
 assert.equal(checked,2);
 assert.equal(JSON.stringify(report).includes('users/'),false);
});
test('does not mistake Auth outages for missing owners',async()=>{
 const db={collectionGroup:()=>({orderBy:()=>({limit:()=>({get:async()=>({docs:[docs[0]]})})})})};
 await assert.rejects(auditFirestoreSessionOrphans({db,auth:{getUser:async()=>{throw Object.assign(new Error('network'),{code:'auth/internal-error'});}}}),/network/);
});
