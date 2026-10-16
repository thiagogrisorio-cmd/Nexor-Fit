import test from 'node:test';
import assert from 'node:assert/strict';
import {installV2AuthSync} from '../offline-v2-auth-bridge.js';

test('V2 auth bridge ignores stale results after account switch',async()=>{
 const originalWindow=globalThis.window,originalDocument=globalThis.document,originalNavigator=globalThis.navigator;
 const events=new Map(),listeners=new Map();
 globalThis.window={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 globalThis.document={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 try{
  const auth={currentUser:null};
  let changeAuth;
  const reported=[];
  const dispose=installV2AuthSync({
   auth,onAuthStateChanged:(_auth,callback)=>{changeAuth=callback;return ()=>{};},
   readRemoteExercise:async()=>{throw Error('Should not read when no queued operations');},
   updateRemoteSet:async()=>{},
   onResult:value=>reported.push(value)
  });
  assert.equal(typeof events.get('online'),'function');
  auth.currentUser={uid:'account-A'};changeAuth(auth.currentUser);
  auth.currentUser={uid:'account-B'};changeAuth(auth.currentUser);
  dispose();
  assert.equal(events.has('online'),false);
  assert.equal(listeners.has('visibilitychange'),false);
  assert.deepEqual(reported,[]);
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:originalNavigator});
 }
});
