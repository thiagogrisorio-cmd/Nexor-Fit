import test from 'node:test';
import assert from 'node:assert/strict';
import {installV2AuthSync} from '../offline-v2-auth-bridge.js';
test('V2 auth bridge installs and unsubscribes without activating legacy UI',()=>{
 const auth={currentUser:null};
 let listener,unsubscribed=false;
 const dispose=installV2AuthSync({
  auth,onAuthStateChanged:(_auth,callback)=>{listener=callback;return ()=>{unsubscribed=true;}},
  readRemoteExercise:async()=>{},updateRemoteSet:async()=>{}
 });
 assert.equal(typeof listener,'function');
 listener(null);
 dispose();
 assert.equal(unsubscribed,true);
});
