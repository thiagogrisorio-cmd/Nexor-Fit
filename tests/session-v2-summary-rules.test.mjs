import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-fit-rules-test',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
test('session summary cannot be forged by its owner or read by a different user',async()=>{
 const uid='summary-owner',id='summary-session';
 const db=env.authenticatedContext(uid).firestore();
 const ref=doc(db,'users',uid,'sessionSummaries',id);
 await assertFails(setDoc(ref,{sessionId:id,completedSets:24,totalSets:24}));
 await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'users',uid,'sessionSummaries',id),{sessionId:id,completedSets:6,totalSets:24}));
 assert.equal((await assertSucceeds(getDoc(ref))).data().completedSets,6);
 await assertFails(updateDoc(ref,{completedSets:24}));
 await assertFails(deleteDoc(ref));
 await assertFails(getDoc(doc(env.authenticatedContext('summary-stranger').firestore(),'users',uid,'sessionSummaries',id)));
});
