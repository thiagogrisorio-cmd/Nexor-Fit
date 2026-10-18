import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleRetirementAudit} from '../v1-retirement-audit-assembly.js';

test('reports V1 activity and orphan owners from paginated mock services',async()=>{
 const auth={listUsers:async()=>({users:[{uid:'a'}]}),getUser:async uid=>{if(uid==='missing')throw Object.assign(Error('missing'),{code:'auth/user-not-found'});return {uid};}};
 const docs=[{ref:{path:'users/a/sessions/s1'}},{ref:{path:'users/missing/sessions/s2'}}];
 const query=rows=>({orderBy(){return this;},limit(){return this;},get:async()=>({docs:rows})});
 const db={collection(){return query([{id:'s1',data:()=>({id:'s1',status:'active',sets:[]})}]);},collectionGroup(){return query(docs);}};
 const report=await assembleRetirementAudit(auth,db);
 assert.equal(report.readOnly,true);
 assert.equal(report.orphanAudit.orphanOwners,1);
 assert.equal(report.readyForReview,false);
 assert.ok(report.blockers.includes('orphan-session-owners'));
});

test('incomplete Auth pagination cannot claim audit readiness',async()=>{
 let pages=0;
 const auth={
  listUsers:async()=>({users:[],pageToken:`more-${++pages}`}),
  getUser:async uid=>({uid})
 };
 const query={orderBy(){return this;},limit(){return this;},get:async()=>({docs:[]})};
 const db={collectionGroup:()=>query,collection:()=>query};
 const report=await assembleRetirementAudit(auth,db);
 assert.equal(pages,10);
 assert.equal(report.complete,false);
 assert.equal(report.readyForReview,false);
 assert.ok(report.blockers.includes('inventory-incomplete'));
 assert.equal(report.readOnly,true);
 assert.equal(JSON.stringify(report).includes('more-'),false);
});

test('incomplete Firestore orphan pagination blocks readiness and hides document paths',async()=>{
 const auth={listUsers:async()=>({users:[]}),getUser:async uid=>({uid})};
 let scans=0;
 const query={orderBy(){return this;},limit(){return this;},startAfter(){return this;},get:async()=>{const page=++scans;return {docs:Array.from({length:100},(_,index)=>({ref:{path:`users/owner/sessions/private-${page}-${index}`}}))};}};
 const db={collectionGroup:()=>query,collection:()=>query};
 const report=await assembleRetirementAudit(auth,db);
 assert.equal(scans,1000);
 assert.equal(report.complete,false);
 assert.equal(report.readyForReview,false);
 assert.ok(report.blockers.includes('orphan-audit-incomplete'));
 assert.equal(report.orphanAudit.sessionDocuments,100000);
 assert.equal(report.orphanAudit.ownersScanned,1);
 assert.equal(report.readOnly,true);
 assert.equal(JSON.stringify(report).includes('private-'),false);
});
