import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {saveReceipt,getReceipt} from '../offline-v2-receipts.js';

test('migrates existing IndexedDB V1 sessions and operations to V2 without losing data',async()=>{
 const original=globalThis.indexedDB;
 globalThis.indexedDB=new IDBFactory();
 try{
  const old=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('nexor-fit-offline-v1',1);
   request.onupgradeneeded=()=>{
    const db=request.result;
    db.createObjectStore('sessions',{keyPath:'id'});
    db.createObjectStore('operations',{keyPath:'id'}).createIndex('sessionId','sessionId');
   };
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=old.transaction(['sessions','operations'],'readwrite');
   tx.objectStore('sessions').put({id:'legacy-session',status:'active'});
   tx.objectStore('operations').put({id:'legacy-operation',sessionId:'legacy-session'});
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  old.close();
  await saveReceipt({id:'new-receipt',revisionAfter:1});
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('nexor-fit-offline-v1',2);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const tx=db.transaction(['sessions','operations'],'readonly');
  const read=store=>new Promise((resolve,reject)=>{const req=tx.objectStore(store).get(store==='sessions'?'legacy-session':'legacy-operation');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  assert.equal((await read('sessions')).id,'legacy-session');
  assert.equal((await read('operations')).id,'legacy-operation');
  assert.equal((await getReceipt('new-receipt')).revisionAfter,1);
  db.close();
 }finally{globalThis.indexedDB=original;}
});
